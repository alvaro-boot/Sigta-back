import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutoringRequest } from './entities/tutoring-request.entity';
import { ProfessorSubject } from '../professor/entities/professor-subject.entity';
import { ProfessorAvailability } from '../professor/entities/professor-availability.entity';
import { TutoringsController } from './tutorings.controller';
import { TutoringsService } from './tutorings.service';
import { TutoringAssignmentService } from './tutoring-assignment.service';
import { SubjectsModule } from '../subjects/subjects.module';
import { UsersModule } from '../users/users.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TutoringRequest,
      ProfessorSubject,
      ProfessorAvailability,
    ]),
    SubjectsModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [TutoringsController],
  providers: [TutoringsService, TutoringAssignmentService],
  exports: [TutoringsService],
})
export class TutoringsModule {}
