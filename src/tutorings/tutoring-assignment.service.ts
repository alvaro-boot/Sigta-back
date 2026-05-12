import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { addDays, startOfWeek } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
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

  /** Devuelve professorUserId o null */
  async pickProfessor(
    subjectId: number,
    startAt: Date,
    endAt: Date,
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

    const candidates: number[] = [];
    for (const pid of unique) {
      const avs = await this.avRepo.find({
        where: { professorUserId: pid, dayOfWeek },
      });
      const ok = avs.some((a) => {
        const sm = timeStringToMinutes(a.startTime);
        const em = timeStringToMinutes(a.endTime);
        return slotCoversRequest(sm, em, startMinutes, endMinutes);
      });
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
          .andWhere('t.status = :st', { st: TutoringStatus.AUTO_ASSIGNED })
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
}
