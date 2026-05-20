import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledNotification } from './entities/scheduled-notification.entity';
import { TutoringNotificationService } from './tutoring-notification.service';
import { NotificationType } from './notification-type.enum';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectRepository(ScheduledNotification)
    private readonly repo: Repository<ScheduledNotification>,
    private readonly moduleRef: ModuleRef,
  ) {}

  async schedule(params: {
    tutoringRequestId: number | null;
    recipientUserId: number;
    type: NotificationType;
    sendAt: Date;
  }): Promise<ScheduledNotification> {
    const row = this.repo.create({
      tutoringRequestId: params.tutoringRequestId,
      recipientUserId: params.recipientUserId,
      type: params.type,
      sendAt: params.sendAt,
      sentAt: null,
      cancelled: false,
    });
    return this.repo.save(row);
  }

  async cancelForTutoring(tutoringRequestId: number): Promise<void> {
    await this.repo.update(
      { tutoringRequestId, sentAt: IsNull(), cancelled: false },
      { cancelled: true },
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processDue(): Promise<void> {
    const handler = this.moduleRef.get(TutoringNotificationService, {
      strict: false,
    });
    const due = await this.repo.find({
      where: {
        sendAt: LessThanOrEqual(new Date()),
        sentAt: IsNull(),
        cancelled: false,
      },
      take: 50,
      order: { sendAt: 'ASC' },
    });
    for (const row of due) {
      try {
        if (row.tutoringRequestId != null) {
          await handler.processScheduled(
            row.type,
            row.tutoringRequestId,
            row.recipientUserId,
          );
        }
        row.sentAt = new Date();
        await this.repo.save(row);
      } catch (e) {
        this.logger.error(`Error enviando notificación #${row.id}`, e);
      }
    }
  }
}
