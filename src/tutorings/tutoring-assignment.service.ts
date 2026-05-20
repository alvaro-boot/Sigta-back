import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, startOfWeek } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { Repository } from 'typeorm';
import { ProfessorSubject } from '../professor/entities/professor-subject.entity';
import { ProfessorAvailability } from '../professor/entities/professor-availability.entity';
import { TutoringRequest } from './entities/tutoring-request.entity';
import { UserRole } from '../common/enums/user-role.enum';
import {
  slotCoversRequest,
  timeStringToMinutes,
  zonedDayAndMinutes,
} from '../common/utils/time.util';
import { TutoringStatus } from '../common/enums/tutoring-status.enum';
import { SessionModality } from '../common/enums/session-modality.enum';

const ONE_H_MS = 60 * 60 * 1000;

export type AvailableSlot = { startAt: string };

@Injectable()
export class TutoringAssignmentService {
  constructor(
    @InjectRepository(ProfessorSubject)
    private readonly psRepo: Repository<ProfessorSubject>,
    @InjectRepository(ProfessorAvailability)
    private readonly avRepo: Repository<ProfessorAvailability>,
    @InjectRepository(TutoringRequest)
    private readonly trRepo: Repository<TutoringRequest>,
    private readonly config: ConfigService,
  ) {}

  private appTimeZone(): string {
    return this.config.get<string>('APP_TIMEZONE') || 'America/Bogota';
  }

  /** Comprueba que el docente tenga la asignatura y una franja compatible con modalidad y horario. */
  async assertProfessorCoversRequest(
    professorUserId: number,
    subjectId: number,
    startAt: Date,
    endAt: Date,
    modality: SessionModality,
  ): Promise<void> {
    const link = await this.psRepo.findOne({
      where: { professorUserId, subjectId },
    });
    if (!link) {
      throw new BadRequestException(
        'El profesor seleccionado no ofrece tutoría en esta asignatura',
      );
    }
    const ok = await this.professorCoversSlot(
      professorUserId,
      startAt,
      endAt,
      modality,
    );
    if (!ok) {
      throw new BadRequestException(
        'El profesor no tiene disponibilidad en esa fecha, hora y modalidad',
      );
    }
  }

  async professorCoversSlot(
    professorUserId: number,
    startAt: Date,
    endAt: Date,
    modality: SessionModality,
  ): Promise<boolean> {
    const tz = this.appTimeZone();
    const { dayOfWeek, startMinutes, endMinutes } = zonedDayAndMinutes(
      startAt,
      endAt,
      tz,
    );
    if (endMinutes <= startMinutes) {
      return false;
    }
    const avs = await this.avRepo.find({
      where: { professorUserId, dayOfWeek, modality },
    });
    return avs.some((a) => {
      const sm = timeStringToMinutes(a.startTime);
      const em = timeStringToMinutes(a.endTime);
      return slotCoversRequest(sm, em, startMinutes, endMinutes);
    });
  }

  /** Devuelve professorUserId o null */
  async pickProfessor(
    subjectId: number,
    startAt: Date,
    endAt: Date,
    modality: SessionModality,
    preferredProfessorId?: number,
  ): Promise<number | null> {
    const tz = this.appTimeZone();
    const { dayOfWeek, startMinutes, endMinutes } = zonedDayAndMinutes(
      startAt,
      endAt,
      tz,
    );
    if (endMinutes <= startMinutes) {
      return null;
    }

    const links = await this.psRepo.find({
      where: { subjectId },
      relations: ['professor'],
    });
    const unique = [
      ...new Set(
        links
          .filter(
            (l) =>
              l.professor?.role === UserRole.PROFESSOR && l.professor.isActive,
          )
          .map((l) => l.professorUserId),
      ),
    ];
    if (!unique.length) return null;

    if (
      preferredProfessorId != null &&
      unique.includes(preferredProfessorId)
    ) {
      const prefOk = await this.professorCoversSlot(
        preferredProfessorId,
        startAt,
        endAt,
        modality,
      );
      if (prefOk) return preferredProfessorId;
    }

    const candidates: number[] = [];
    for (const pid of unique) {
      const ok = await this.professorCoversSlot(pid, startAt, endAt, modality);
      if (ok) candidates.push(pid);
    }
    if (!candidates.length) return null;

    const weekStart = this.startOfAppWeek(startAt, tz);
    const weekEnd = addDays(weekStart, 7);

    const scored = await Promise.all(
      candidates.map(async (professorId) => {
        const count = await this.trRepo
          .createQueryBuilder('t')
          .where('t.professor_id = :professorId', { professorId })
          .andWhere('t.status IN (:...sts)', {
            sts: [
              TutoringStatus.PENDING_CONFIRMATION,
              TutoringStatus.CONFIRMED,
            ],
          })
          .andWhere('t.start_at >= :ws', { ws: weekStart })
          .andWhere('t.start_at < :we', { we: weekEnd })
          .getCount();
        return { professorId, count };
      }),
    );
    scored.sort((a, b) => a.count - b.count || a.professorId - b.professorId);
    return scored[0].professorId;
  }

  /** Lunes 00:00 en la zona de la app, como instante UTC */
  private startOfAppWeek(d: Date, timeZone: string): Date {
    const zoned = toZonedTime(d, timeZone);
    const mondayWall = startOfWeek(zoned, { weekStartsOn: 1 });
    return fromZonedTime(mondayWall, timeZone);
  }

  private async professorIdsForSubject(subjectId: number): Promise<number[]> {
    const links = await this.psRepo.find({
      where: { subjectId },
      relations: ['professor'],
    });
    return [
      ...new Set(
        links
          .filter(
            (l) =>
              l.professor?.role === UserRole.PROFESSOR && l.professor.isActive,
          )
          .map((l) => l.professorUserId),
      ),
    ];
  }

  /** Franjas de inicio de 1 h para una fecha civil, materia y modalidad. */
  async listAvailableSlots(
    subjectId: number,
    date: string,
    modality: SessionModality,
    professorId?: number,
  ): Promise<AvailableSlot[]> {
    const tz = this.appTimeZone();
    const noon = fromZonedTime(`${date}T12:00:00`, tz);
    if (isNaN(+noon)) {
      throw new BadRequestException('Fecha inválida');
    }

    let professorIds: number[];
    if (professorId != null) {
      const link = await this.psRepo.findOne({
        where: { professorUserId: professorId, subjectId },
        relations: ['professor'],
      });
      if (
        !link?.professor ||
        link.professor.role !== UserRole.PROFESSOR ||
        !link.professor.isActive
      ) {
        return [];
      }
      professorIds = [professorId];
    } else {
      professorIds = await this.professorIdsForSubject(subjectId);
    }
    if (!professorIds.length) return [];

    const isoDow = parseInt(formatInTimeZone(noon, tz, 'i'), 10);
    const dayOfWeek = isoDow === 7 ? 0 : isoDow;
    const now = Date.now();
    const starts = new Set<number>();

    for (const pid of professorIds) {
      const avs = await this.avRepo.find({
        where: { professorUserId: pid, dayOfWeek, modality },
      });
      for (const av of avs) {
        const slotStartMin = timeStringToMinutes(av.startTime);
        const slotEndMin = timeStringToMinutes(av.endTime);
        for (let m = slotStartMin; m + 60 <= slotEndMin; m += 60) {
          const h = Math.floor(m / 60);
          const min = m % 60;
          const wall = `${date}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
          const startAt = fromZonedTime(wall, tz);
          const endAt = new Date(startAt.getTime() + ONE_H_MS);
          if (startAt.getTime() <= now) continue;
          const ok = await this.professorCoversSlot(
            pid,
            startAt,
            endAt,
            modality,
          );
          if (ok) starts.add(startAt.getTime());
        }
      }
    }

    return [...starts]
      .sort((a, b) => a - b)
      .map((t) => ({ startAt: new Date(t).toISOString() }));
  }
}
