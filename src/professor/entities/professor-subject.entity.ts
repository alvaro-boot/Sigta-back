import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';

@Entity('professor_subjects')
@Unique(['professorUserId', 'subjectId'])
export class ProfessorSubject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'professor_user_id' })
  professorUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professor_user_id' })
  professor: User;

  @Column({ name: 'subject_id' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;
}
