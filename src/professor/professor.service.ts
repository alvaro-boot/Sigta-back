import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProfessorSubject } from './entities/professor-subject.entity';
import { ProfessorAvailability } from './entities/professor-availability.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { SubjectsService } from '../subjects/subjects.service';
import { SessionModality } from '../common/enums/session-modality.enum';
import type { UpdateProfessorProfileDto } from './dto/professor-profile.dto';

export type CatalogProfessorRow = {
  id: number;
  fullName: string;
  profileBio: string | null;
  officeLocation: string | null;
  subjects: { id: number; name: string; code: string | null }[];
  modalities: SessionModality[];
};

export type CatalogAvailabilitySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  modality: SessionModality;
};

export type CatalogProfessorDetail = CatalogProfessorRow & {
  virtualMeetingUrl: string | null;
  availability: CatalogAvailabilitySlot[];
};

@Injectable()
export class ProfessorService {
  constructor(
    @InjectRepository(ProfessorSubject)
    private readonly psRepo: Repository<ProfessorSubject>,
    @InjectRepository(ProfessorAvailability)
    private readonly avRepo: Repository<ProfessorAvailability>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
      order: { dayOfWeek: 'ASC', startTime: 'ASC', modality: 'ASC' },
    });
  }

  async addAvailability(
    professorUserId: number,
    body: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      modality: SessionModality;
    },
  ) {
    await this.assertProfessor(professorUserId);
    const normalize = (t: string) => (t.length === 5 ? `${t}:00` : t);
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
      modality: body.modality,
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

  async updateProfile(
    professorUserId: number,
    dto: UpdateProfessorProfileDto,
  ): Promise<{
    id: number;
    fullName: string;
    profileBio: string | null;
    officeLocation: string | null;
    virtualMeetingUrl: string | null;
  }> {
    await this.assertProfessor(professorUserId);
    const u = await this.userRepo.findOne({ where: { id: professorUserId } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    if (dto.profileBio !== undefined) u.profileBio = dto.profileBio;
    if (dto.officeLocation !== undefined) u.officeLocation = dto.officeLocation;
    if (dto.virtualMeetingUrl !== undefined) {
      u.virtualMeetingUrl = dto.virtualMeetingUrl;
    }
    await this.userRepo.save(u);
    return {
      id: u.id,
      fullName: u.fullName,
      profileBio: u.profileBio,
      officeLocation: u.officeLocation,
      virtualMeetingUrl: u.virtualMeetingUrl,
    };
  }

  async getMyPublicProfile(professorUserId: number) {
    await this.assertProfessor(professorUserId);
    const u = await this.userRepo.findOne({ where: { id: professorUserId } });
    if (!u) throw new NotFoundException('Usuario no encontrado');
    return {
      id: u.id,
      fullName: u.fullName,
      profileBio: u.profileBio,
      officeLocation: u.officeLocation,
      virtualMeetingUrl: u.virtualMeetingUrl,
    };
  }

  async listCatalogProfessors(): Promise<CatalogProfessorRow[]> {
    const profs = await this.userRepo.find({
      where: { role: UserRole.PROFESSOR, isActive: true },
      order: { fullName: 'ASC' },
    });
    const ids = profs.map((p) => p.id);
    if (!ids.length) return [];

    const specs = await this.psRepo.find({
      where: { professorUserId: In(ids) },
      relations: ['subject'],
    });
    const avs = await this.avRepo.find({
      where: { professorUserId: In(ids) },
    });

    const specByProf = new Map<number, ProfessorSubject[]>();
    for (const s of specs) {
      const arr = specByProf.get(s.professorUserId) ?? [];
      arr.push(s);
      specByProf.set(s.professorUserId, arr);
    }
    const avByProf = new Map<number, ProfessorAvailability[]>();
    for (const a of avs) {
      const arr = avByProf.get(a.professorUserId) ?? [];
      arr.push(a);
      avByProf.set(a.professorUserId, arr);
    }

    return profs.map((p) => {
      const subRows = specByProf.get(p.id) ?? [];
      const subjects = subRows.map((r) => ({
        id: r.subject.id,
        name: r.subject.name,
        code: r.subject.code,
      }));
      const modSet = new Set<SessionModality>();
      for (const a of avByProf.get(p.id) ?? []) {
        modSet.add(a.modality);
      }
      return {
        id: p.id,
        fullName: p.fullName,
        profileBio: p.profileBio,
        officeLocation: p.officeLocation,
        subjects,
        modalities: [...modSet],
      };
    });
  }

  async getCatalogProfessorById(id: number): Promise<CatalogProfessorDetail> {
    const u = await this.userRepo.findOne({ where: { id } });
    if (!u || u.role !== UserRole.PROFESSOR || !u.isActive) {
      throw new NotFoundException('Profesor no encontrado');
    }
    const specs = await this.psRepo.find({
      where: { professorUserId: id },
      relations: ['subject'],
    });
    const avs = await this.avRepo.find({ where: { professorUserId: id } });
    const modalities = [...new Set(avs.map((a) => a.modality))];
    const subjects = specs.map((r) => ({
      id: r.subject.id,
      name: r.subject.name,
      code: r.subject.code,
    }));
    const availability = avs
      .map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        modality: a.modality,
      }))
      .sort(
        (x, y) =>
          x.dayOfWeek - y.dayOfWeek ||
          x.startTime.localeCompare(y.startTime) ||
          x.modality.localeCompare(y.modality),
      );

    return {
      id: u.id,
      fullName: u.fullName,
      profileBio: u.profileBio,
      officeLocation: u.officeLocation,
      subjects,
      modalities,
      virtualMeetingUrl: u.virtualMeetingUrl,
      availability,
    };
  }
}
