import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfessorSubject } from './entities/professor-subject.entity';
import { ProfessorAvailability } from './entities/professor-availability.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { SubjectsService } from '../subjects/subjects.service';

@Injectable()
export class ProfessorService {
  constructor(
    @InjectRepository(ProfessorSubject)
    private readonly psRepo: Repository<ProfessorSubject>,
    @InjectRepository(ProfessorAvailability)
    private readonly avRepo: Repository<ProfessorAvailability>,
    private readonly usersService: UsersService,
    private readonly subjectsService: SubjectsService,
  ) {}

  private async assertProfessor(userId: number) {
    const u = await this.usersService.findById(userId);
    if (!u || u.role !== UserRole.PROFESSOR) {
      throw new ForbiddenException('Solo profesores');
    }
  }

  async listSpecialties(professorUserId: number) {
    await this.assertProfessor(professorUserId);
    return this.psRepo.find({
      where: { professorUserId },
      relations: ['subject'],
      order: { id: 'ASC' },
    });
  }

  async addSpecialty(professorUserId: number, subjectId: number) {
    await this.assertProfessor(professorUserId);
    await this.subjectsService.findOne(subjectId);
    const exists = await this.psRepo.findOne({
      where: { professorUserId, subjectId },
    });
    if (exists) return exists;
    const row = this.psRepo.create({ professorUserId, subjectId });
    return this.psRepo.save(row);
  }

  async removeSpecialty(professorUserId: number, subjectId: number) {
    await this.assertProfessor(professorUserId);
    const row = await this.psRepo.findOne({
      where: { professorUserId, subjectId },
    });
    if (!row) throw new NotFoundException('Especialidad no registrada');
    await this.psRepo.remove(row);
    return { ok: true };
  }

  async listAvailability(professorUserId: number) {
    await this.assertProfessor(professorUserId);
    return this.avRepo.find({
      where: { professorUserId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async addAvailability(
    professorUserId: number,
    body: { dayOfWeek: number; startTime: string; endTime: string },
  ) {
    await this.assertProfessor(professorUserId);
    const normalize = (t: string) =>
      t.length === 5 ? `${t}:00` : t;
    const st = normalize(body.startTime);
    const en = normalize(body.endTime);
    if (st >= en) {
      throw new BadRequestException('startTime debe ser menor que endTime');
    }
    const row = this.avRepo.create({
      professorUserId,
      dayOfWeek: body.dayOfWeek,
      startTime: st,
      endTime: en,
    });
    return this.avRepo.save(row);
  }

  async removeAvailability(professorUserId: number, id: number) {
    await this.assertProfessor(professorUserId);
    const row = await this.avRepo.findOne({ where: { id } });
    if (!row || row.professorUserId !== professorUserId) {
      throw new NotFoundException('Franja no encontrada');
    }
    await this.avRepo.remove(row);
    return { ok: true };
  }
}
