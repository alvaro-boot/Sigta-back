import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { TutoringStatus } from '../../common/enums/tutoring-status.enum';
import { SessionModality } from '../../common/enums/session-modality.enum';

@Entity('tutoring_requests')
export class TutoringRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'subject_id' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'start_at', type: 'datetime' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'datetime' })
  endAt: Date;

  @Column({ type: 'enum', enum: TutoringStatus })
  status: TutoringStatus;

  @Column({ name: 'professor_id', nullable: true })
  professorId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'professor_id' })
  professor: User | null;

  @Column({
    type: 'enum',
    enum: SessionModality,
    default: SessionModality.IN_PERSON,
  })
  modality: SessionModality;

  /** Motivo o tema breve (opcional) para que el docente prepare la sesión. */
  @Column({ name: 'student_topic', type: 'varchar', length: 500, nullable: true })
  studentTopic: string | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true })
  cancelReason: string | null;

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
