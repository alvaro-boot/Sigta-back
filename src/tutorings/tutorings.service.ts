import {
  ForbiddenException,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TutoringRequest } from './entities/tutoring-request.entity';
import { CreateTutoringRequestDto } from './dto/create-tutoring-request.dto';
import { TutoringAssignmentService } from './tutoring-assignment.service';
import { TutoringStatus } from '../common/enums/tutoring-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { SubjectsService } from '../subjects/subjects.service';

@Injectable()
export class TutoringsService {
  constructor(
    @InjectRepository(TutoringRequest)
    private readonly repo: Repository<TutoringRequest>,
    private readonly dataSource: DataSource,
    private readonly assignment: TutoringAssignmentService,
    private readonly subjectsService: SubjectsService,
  ) {}

  async createForStudent(studentId: number, role: UserRole, dto: CreateTutoringRequestDto) {
    if (role !== UserRole.STUDENT) {
      throw new ForbiddenException('Solo estudiantes pueden solicitar tutoría');
    }
    const start = new Date(dto.startAt);
    if (!(start instanceof Date) || isNaN(+start)) {
      throw new BadRequestException('Fecha de inicio inválida');
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await this.subjectsService.findOne(dto.subjectId);

    return this.dataSource.transaction(async (manager) => {
      const professorId = await this.assignment.pickProfessor(
        dto.subjectId,
        start,
        end,
      );
      const status =
        professorId !== null
          ? TutoringStatus.AUTO_ASSIGNED
          : TutoringStatus.UNASSIGNED;
      const row = manager.create(TutoringRequest, {
        studentId,
        subjectId: dto.subjectId,
        startAt: start,
        endAt: end,
        status,
        professorId,
      });
      return manager.save(TutoringRequest, row);
    });
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
    // ADMIN ve todo
    return qb.getMany();
  }
}
