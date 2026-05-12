import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryColumn({ type: 'varchar', length: 191 })
  key: string;

  @Column({ type: 'text' })
  value: string;
}
