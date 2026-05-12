import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutoringRequest } from './entities/tutoring-request.entity';
import { ProfessorSubject } from '../professor/entities/professor-subject.entity';
import { ProfessorAvailability } from '../professor/entities/professor-availability.entity';
import { TutoringsService } from './tutorings.service';
import { TutoringsController } from './tutorings.controller';
import { TutoringAssignmentService } from './tutoring-assignment.service';
import { SubjectsModule } from '../subjects/subjects.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutoringRequest,
      ProfessorSubject,
      ProfessorAvailability,
    ]),
    SubjectsModule,
  ],
  controllers: [TutoringsController],
  providers: [TutoringsService, TutoringAssignmentService],
  exports: [TutoringsService],
})
export class TutoringsModule {}
