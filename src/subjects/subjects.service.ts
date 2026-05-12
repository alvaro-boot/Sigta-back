import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly repo: Repository<Subject>,
  ) {}

  findAll(): Promise<Subject[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number): Promise<Subject> {
    const s = await this.repo.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Asignatura no encontrada');
    return s;
  }

  create(dto: CreateSubjectDto): Promise<Subject> {
    const row = this.repo.create({
      name: dto.name,
      code: dto.code ?? null,
    });
    return this.repo.save(row);
  }

  async update(id: number, dto: UpdateSubjectDto): Promise<Subject> {
    const s = await this.findOne(id);
    if (dto.name !== undefined) s.name = dto.name;
    if (dto.code !== undefined) s.code = dto.code;
    return this.repo.save(s);
  }

  async remove(id: number): Promise<void> {
    const s = await this.findOne(id);
    await this.repo.remove(s);
  }
}
