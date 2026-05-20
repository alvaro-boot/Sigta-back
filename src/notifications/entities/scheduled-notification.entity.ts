import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationType } from '../notification-type.enum';

@Entity('scheduled_notifications')
@Index(['sendAt', 'sentAt', 'cancelled'])
export class ScheduledNotification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tutoring_request_id', nullable: true })
  tutoringRequestId: number | null;

  @Column({ name: 'recipient_user_id' })
  recipientUserId: number;

  @Column({ type: 'varchar', length: 64 })
  type: NotificationType;

  @Column({ name: 'send_at', type: 'datetime' })
  sendAt: Date;

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt: Date | null;

  @Column({ default: false })
  cancelled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
