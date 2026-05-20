import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledNotification } from './entities/scheduled-notification.entity';
import { TutoringRequest } from '../tutorings/entities/tutoring-request.entity';
import { User } from '../users/entities/user.entity';
import { UltraMsgService } from './ultramsg.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { TutoringNotificationService } from './tutoring-notification.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledNotification, TutoringRequest, User]),
    AdminModule,
  ],
  providers: [
    UltraMsgService,
    NotificationSchedulerService,
    TutoringNotificationService,
  ],
  exports: [TutoringNotificationService, UltraMsgService],
})
export class NotificationsModule {}
