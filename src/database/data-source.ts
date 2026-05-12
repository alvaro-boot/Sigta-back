import { join } from 'path';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { ProfessorSubject } from '../professor/entities/professor-subject.entity';
import { ProfessorAvailability } from '../professor/entities/professor-availability.entity';
import { TutoringRequest } from '../tutorings/entities/tutoring-request.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';

dotenv.config({ path: join(process.cwd(), '.env') });

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'sigta',
  entities: [
    User,
    Subject,
    ProfessorSubject,
    ProfessorAvailability,
    TutoringRequest,
    SystemSetting,
  ],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'sigta_migrations',
});
