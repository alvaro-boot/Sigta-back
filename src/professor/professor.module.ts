import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfessorSubject } from './entities/professor-subject.entity';
import { ProfessorAvailability } from './entities/professor-availability.entity';
import { ProfessorService } from './professor.service';
import { ProfessorController } from './professor.controller';
import { ProfessorCatalogController } from './professor-catalog.controller';
import { UsersModule } from '../users/users.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProfessorSubject,
      ProfessorAvailability,
      User,
    ]),
    UsersModule,
    SubjectsModule,
  ],
  controllers: [ProfessorController, ProfessorCatalogController],
  providers: [ProfessorService],
  exports: [ProfessorService, TypeOrmModule],
})
export class ProfessorModule {}
