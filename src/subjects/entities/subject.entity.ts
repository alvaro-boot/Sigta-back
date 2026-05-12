import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  code: string | null;
}
