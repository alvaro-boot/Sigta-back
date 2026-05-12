import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('professor_availability')
export class ProfessorAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'professor_user_id' })
  professorUserId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'professor_user_id' })
  professor: User;

  /** 0 = domingo … 6 = sábado (Date.getUTCDay()) */
  @Column({ name: 'day_of_week', type: 'tinyint', unsigned: true })
  dayOfWeek: number;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;
}
