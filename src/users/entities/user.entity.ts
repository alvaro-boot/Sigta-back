import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Exclude({ toPlainOnly: true })
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Texto libre visible a estudiantes en el directorio (docentes). */
  @Column({ name: 'profile_bio', type: 'text', nullable: true })
  profileBio: string | null;

  /** Ubicación u oficina para tutorías presenciales. */
  @Column({ name: 'office_location', type: 'varchar', length: 255, nullable: true })
  officeLocation: string | null;

  /** Enlace por defecto para sesiones virtuales (Meet, Teams, etc.). */
  @Column({ name: 'virtual_meeting_url', type: 'varchar', length: 512, nullable: true })
  virtualMeetingUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
