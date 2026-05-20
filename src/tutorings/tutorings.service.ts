import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { TutoringRequest } from './entities/tutoring-request.entity';
import { CreateTutoringRequestDto } from './dto/create-tutoring-request.dto';
import { CancelTutoringDto } from './dto/cancel-tutoring.dto';
import { RescheduleTutoringDto } from './dto/reschedule-tutoring.dto';
import { AvailableSlotsQueryDto } from './dto/available-slots-query.dto';
import { TutoringAssignmentService } from './tutoring-assignment.service';
import { TutoringStatus } from '../common/enums/tutoring-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { SubjectsService } from '../subjects/subjects.service';
import { UsersService } from '../users/users.service';
import { AdminService } from '../admin/admin.service';
import { ProfessorSubject } from '../professor/entities/professor-subject.entity';
import { TutoringNotificationService } from '../notifications/tutoring-notification.service';

const ONE_H_MS = 60 * 60 * 1000;

@Injectable()
export class TutoringsService {
  constructor(
    @InjectRepository(TutoringRequest)
    private readonly repo: Repository<TutoringRequest>,
    @InjectRepository(ProfessorSubject)
    private readonly psRepo: Repository<ProfessorSubject>,
    private readonly dataSource: DataSource,
    private readonly assignment: TutoringAssignmentService,
    private readonly subjectsService: SubjectsService,
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
    private readonly notifications: TutoringNotificationService,
  ) {}

  private hoursUntilStart(startAt: Date): number {
    return (startAt.getTime() - Date.now()) / 3_600_000;
  }

  private async minHoursBeforeChange(): Promise<number> {
    return this.adminService.getNumber('tutoring_cancel_min_hours_before', 24);
  }

  private async assertMayChangeOrCancelSession(startAt: Date): Promise<void> {
    const minH = await this.minHoursBeforeChange();
    if (this.hoursUntilStart(startAt) < minH) {
      throw new BadRequestException(
        `Solo se permite hasta ${minH} h antes del inicio de la sesión`,
      );
    }
  }

  async createForStudent(
    studentId: number,
    role: UserRole,
    dto: CreateTutoringRequestDto,
  ) {
    if (role !== UserRole.STUDENT) {
      throw new ForbiddenException('Solo estudiantes pueden solicitar tutoría');
    }
    const start = new Date(dto.startAt);
    if (!(start instanceof Date) || isNaN(+start)) {
      throw new BadRequestException('Fecha de inicio inválida');
    }
    const end = new Date(start.getTime() + ONE_H_MS);
    await this.subjectsService.findOne(dto.subjectId);

    if (dto.professorId != null && dto.preferredProfessorId != null) {
      throw new BadRequestException(
        'No uses profesorId y preferredProfessorId a la vez',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      let professorId: number | null = null;
      let status: TutoringStatus;

      if (dto.professorId != null) {
        const prof = await this.usersService.findById(dto.professorId);
        if (!prof || prof.role !== UserRole.PROFESSOR || !prof.isActive) {
          throw new BadRequestException('Profesor no válido o inactivo');
        }
        await this.assignment.assertProfessorCoversRequest(
          prof.id,
          dto.subjectId,
          start,
          end,
          dto.modality,
        );
        professorId = prof.id;
        status = TutoringStatus.PENDING_CONFIRMATION;
      } else {
        professorId = await this.assignment.pickProfessor(
          dto.subjectId,
          start,
          end,
          dto.modality,
          dto.preferredProfessorId,
        );
        if (professorId === null) {
          throw new BadRequestException(
            'No hay disponibilidad para esa fecha, hora y modalidad',
          );
        }
        status = TutoringStatus.PENDING_CONFIRMATION;
      }

      const row = manager.create(TutoringRequest, {
        studentId,
        subjectId: dto.subjectId,
        startAt: start,
        endAt: end,
        status,
        professorId,
        modality: dto.modality,
        studentTopic: dto.topic?.trim() ? dto.topic.trim() : null,
        cancelledAt: null,
        cancelReason: null,
        confirmedAt: null,
      });
      return manager.save(TutoringRequest, row);
    }).then((saved) => {
      void this.notifications.onStudentRequestCreated(saved.id);
      return saved;
    });
  }

  async listAvailableSlotsForStudent(
    role: UserRole,
    query: AvailableSlotsQueryDto,
  ) {
    if (role !== UserRole.STUDENT) {
      throw new ForbiddenException(
        'Solo estudiantes pueden consultar horarios disponibles',
      );
    }
    await this.subjectsService.findOne(query.subjectId);
    const slots = await this.assignment.listAvailableSlots(
      query.subjectId,
      query.date,
      query.modality,
      query.professorId,
    );
    return { slots };
  }

  async listFor(
    userId: number,
    role: UserRole,
  ): Promise<TutoringRequest[]> {
    const qb = this.repo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.subject', 'subject')
      .leftJoinAndSelect('t.student', 'student')
      .leftJoinAndSelect('t.professor', 'professor')
      .orderBy('t.start_at', 'DESC');

    if (role === UserRole.STUDENT) {
      qb.where('t.student_id = :userId', { userId });
    } else if (role === UserRole.PROFESSOR) {
      qb.where('t.professor_id = :userId', { userId });
    }
    return qb.getMany();
  }

  async listUnassignedQueue(
    userId: number,
    role: UserRole,
  ): Promise<TutoringRequest[]> {
    if (role !== UserRole.PROFESSOR) {
      throw new ForbiddenException('Solo profesores');
    }
    const specs = await this.psRepo.find({
      where: { professorUserId: userId },
    });
    const subjectIds = [...new Set(specs.map((s) => s.subjectId))];
    if (!subjectIds.length) return [];
    return this.repo.find({
      where: {
        status: TutoringStatus.UNASSIGNED,
        subjectId: In(subjectIds),
      },
      relations: ['subject', 'student'],
      order: { startAt: 'ASC' },
    });
  }

  async cancelByStudent(
    studentId: number,
    role: UserRole,
    id: number,
    dto: CancelTutoringDto,
  ) {
    if (role !== UserRole.STUDENT) {
      throw new ForbiddenException('Solo el estudiante puede anular su solicitud');
    }
    const t = await this.repo.findOne({ where: { id } });
    if (!t || t.studentId !== studentId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (
      t.status === TutoringStatus.CANCELLED ||
      t.status === TutoringStatus.COMPLETED
    ) {
      throw new BadRequestException('Esta solicitud ya no se puede anular');
    }
    await this.assertMayChangeOrCancelSession(t.startAt);
    t.status = TutoringStatus.CANCELLED;
    t.cancelledAt = new Date();
    t.cancelReason = dto.reason?.trim() ? dto.reason.trim() : null;
    t.confirmedAt = null;
    const saved = await this.repo.save(t);
    void this.notifications.onCancelled(id);
    return saved;
  }

  async rescheduleByStudent(
    studentId: number,
    role: UserRole,
    id: number,
    dto: RescheduleTutoringDto,
  ) {
    if (role !== UserRole.STUDENT) {
      throw new ForbiddenException('Solo el estudiante puede reprogramar');
    }
    const t = await this.repo.findOne({
      where: { id },
      relations: ['subject'],
    });
    if (!t || t.studentId !== studentId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (
      t.status === TutoringStatus.CANCELLED ||
      t.status === TutoringStatus.COMPLETED
    ) {
      throw new BadRequestException('Esta solicitud no admite cambio de hora');
    }
    await this.assertMayChangeOrCancelSession(t.startAt);

    const newStart = new Date(dto.startAt);
    if (!(newStart instanceof Date) || isNaN(+newStart)) {
      throw new BadRequestException('Fecha de inicio inválida');
    }
    if (newStart.getTime() <= Date.now()) {
      throw new BadRequestException('La nueva hora debe ser en el futuro');
    }
    const newEnd = new Date(newStart.getTime() + ONE_H_MS);

    if (t.status === TutoringStatus.UNASSIGNED) {
      t.startAt = newStart;
      t.endAt = newEnd;
      return this.repo.save(t);
    }

    if (!t.professorId) {
      throw new BadRequestException('Estado inconsistente');
    }

    await this.assignment.assertProfessorCoversRequest(
      t.professorId,
      t.subjectId,
      newStart,
      newEnd,
      t.modality,
    );

    t.startAt = newStart;
    t.endAt = newEnd;
    if (t.status === TutoringStatus.CONFIRMED) {
      t.status = TutoringStatus.PENDING_CONFIRMATION;
      t.confirmedAt = null;
    }
    return this.repo.save(t);
  }

  async confirmByProfessor(userId: number, role: UserRole, id: number) {
    if (role !== UserRole.PROFESSOR) {
      throw new ForbiddenException('Solo el docente asignado puede confirmar');
    }
    const t = await this.repo.findOne({ where: { id } });
    if (!t || t.professorId !== userId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (t.status !== TutoringStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException('La solicitud no está pendiente de confirmación');
    }
    t.status = TutoringStatus.CONFIRMED;
    t.confirmedAt = new Date();
    const saved = await this.repo.save(t);
    void this.notifications.onProfessorConfirmed(id);
    return saved;
  }

  async releaseByProfessor(userId: number, role: UserRole, id: number) {
    if (role !== UserRole.PROFESSOR) {
      throw new ForbiddenException('Solo el docente asignado puede devolver la solicitud');
    }
    const t = await this.repo.findOne({ where: { id } });
    if (!t || t.professorId !== userId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (t.status !== TutoringStatus.PENDING_CONFIRMATION) {
      throw new BadRequestException(
        'Solo se puede devolver a cola si aún no está confirmada',
      );
    }
    t.status = TutoringStatus.UNASSIGNED;
    t.professorId = null;
    t.confirmedAt = null;
    const saved = await this.repo.save(t);
    void this.notifications.onUnassignedNeedsAdmin(id);
    return saved;
  }

  async completeByProfessor(userId: number, role: UserRole, id: number) {
    if (role !== UserRole.PROFESSOR) {
      throw new ForbiddenException('Solo el docente asignado puede marcar como realizada');
    }
    const t = await this.repo.findOne({ where: { id } });
    if (!t || t.professorId !== userId) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (t.status !== TutoringStatus.CONFIRMED) {
      throw new BadRequestException('Solo sesiones confirmadas pueden marcarse como realizadas');
    }
    t.status = TutoringStatus.COMPLETED;
    return this.repo.save(t);
  }

  async claimUnassigned(userId: number, role: UserRole, id: number) {
    if (role !== UserRole.PROFESSOR) {
      throw new ForbiddenException('Solo profesores');
    }
    return this.dataSource.transaction(async (manager) => {
      const t = await manager.findOne(TutoringRequest, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!t) throw new NotFoundException('Solicitud no encontrada');
      if (t.status !== TutoringStatus.UNASSIGNED) {
        throw new BadRequestException('La solicitud ya no está disponible en cola');
      }
      const link = await this.psRepo.findOne({
        where: { professorUserId: userId, subjectId: t.subjectId },
      });
      if (!link) {
        throw new ForbiddenException('No impartes tutoría en esta asignatura');
      }
      await this.assignment.assertProfessorCoversRequest(
        userId,
        t.subjectId,
        t.startAt,
        t.endAt,
        t.modality,
      );
      t.professorId = userId;
      t.status = TutoringStatus.PENDING_CONFIRMATION;
      return manager.save(TutoringRequest, t);
    }).then((saved) => {
      void this.notifications.onProfessorClaimed(saved.id);
      return saved;
    });
  }
}
