import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorSubject } from './entities/professor-subject.entity';
import { ProfessorAvailability } from './entities/professor-availability.entity';
import { ProfessorService } from './professor.service';
import { ProfessorController } from './professor.controller';
import { UsersModule } from '../users/users.module';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProfessorSubject, ProfessorAvailability]),
    UsersModule,
    SubjectsModule,
  ],
  controllers: [ProfessorController],
  providers: [ProfessorService],
  exports: [ProfessorService, TypeOrmModule],
})
export class ProfessorModule {}
