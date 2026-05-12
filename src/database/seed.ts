import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { ProfessorSubject } from '../professor/entities/professor-subject.entity';
import { ProfessorAvailability } from '../professor/entities/professor-availability.entity';
import { TutoringRequest } from '../tutorings/entities/tutoring-request.entity';
import { SystemSetting } from '../admin/entities/system-setting.entity';
import { UserRole } from '../common/enums/user-role.enum';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function run() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      User,
      Subject,
      ProfessorSubject,
      ProfessorAvailability,
      TutoringRequest,
      SystemSetting,
    ],
    synchronize: process.env.TYPEORM_SYNC === 'true',
    timezone: 'Z',
  });
  await ds.initialize();
  const userRepo = ds.getRepository(User);
  const n = await userRepo.count();
  if (n > 0) {
    console.log('Ya existen usuarios; no se ejecuta seed.');
    await ds.destroy();
    return;
  }
  const hash = await bcrypt.hash('Admin123!', 10);
  await userRepo.save(
    userRepo.create({
      email: 'admin@sigta.local',
      passwordHash: hash,
      role: UserRole.ADMIN,
      fullName: 'Administrador',
      isActive: true,
    }),
  );
  console.log('Seed: creado admin@sigta.local / Admin123!');
  await ds.destroy();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
