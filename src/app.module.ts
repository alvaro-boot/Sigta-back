import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SubjectsModule } from './subjects/subjects.module';
import { ProfessorModule } from './professor/professor.module';
import { TutoringsModule } from './tutorings/tutorings.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: parseInt(config.get('DB_PORT', '3306'), 10),
        username: config.get('DB_USER', 'root'),
        password: config.get('DB_PASSWORD', ''),
        database: config.get('DB_NAME', 'sigta'),
        autoLoadEntities: true,
        synchronize: config.get('TYPEORM_SYNC', 'false') === 'true',
        timezone: 'Z',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    SubjectsModule,
    ProfessorModule,
    TutoringsModule,
    AdminModule,
  ],
})
export class AppModule {}
