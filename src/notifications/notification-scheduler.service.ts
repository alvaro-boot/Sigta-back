import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, LessThanOrEqual } from 'typeorm';
import { ScheduledNotification } from './entities/scheduled-notification.entity';
import { NotificationType } from './notification-type.enum';
import { TutoringNotificationService } from './tutoring-notification.service';

/** Revisa la cola cada 30 s (recordatorios lejanos y mensajes no disparados por timer). */
const POLL_MS = 30_000;
/** Temporizadores en memoria para envíos con fecha cercana (p. ej. +1 min tras asignar). */
const MAX_TIMER_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class NotificationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly rowTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    @InjectRepository(ScheduledNotification)
    private readonly repo: Repository<ScheduledNotification>,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rearmAllPending();
    this.pollTimer = setInterval(() => {
      void this.processDue();
    }, POLL_MS);
    this.logger.log(
      `Cola WhatsApp activa (poll cada ${POLL_MS / 1000}s + timers por mensaje)`,
    );
  }

  onModuleDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    for (const t of this.rowTimers.values()) clearTimeout(t);
    this.rowTimers.clear();
  }

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
    const saved = await this.repo.save(row);
    this.armRow(saved);
    return saved;
  }

  async cancelForTutoring(tutoringRequestId: number): Promise<void> {
    const pending = await this.repo.find({
      where: { tutoringRequestId, sentAt: IsNull(), cancelled: false },
    });
    for (const row of pending) {
      this.clearRowTimer(row.id);
    }
    await this.repo.update(
      { tutoringRequestId, sentAt: IsNull(), cancelled: false },
      { cancelled: true },
    );
  }

  private clearRowTimer(id: number): void {
    const t = this.rowTimers.get(id);
    if (t) {
      clearTimeout(t);
      this.rowTimers.delete(id);
    }
  }

  private armRow(row: ScheduledNotification): void {
    if (row.sentAt || row.cancelled) return;
    this.clearRowTimer(row.id);
    const delay = row.sendAt.getTime() - Date.now();
    if (delay <= 0) return;
    if (delay > MAX_TIMER_MS) return;
    const timer = setTimeout(() => {
      void this.processRowById(row.id);
    }, delay);
    this.rowTimers.set(row.id, timer);
  }

  private async rearmAllPending(): Promise<void> {
    const pending = await this.repo.find({
      where: { sentAt: IsNull(), cancelled: false },
    });
    for (const row of pending) {
      this.armRow(row);
    }
    await this.processDue();
  }

  async processRowById(id: number): Promise<void> {
    this.clearRowTimer(id);
    const row = await this.repo.findOne({ where: { id } });
    if (!row || row.sentAt || row.cancelled) return;
    if (row.sendAt.getTime() > Date.now()) {
      this.armRow(row);
      return;
    }
    const handler = this.moduleRef.get(TutoringNotificationService, {
      strict: false,
    });
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

  async processDue(): Promise<number> {
    const due = await this.repo.find({
      where: {
        sendAt: LessThanOrEqual(new Date()),
        sentAt: IsNull(),
        cancelled: false,
      },
      take: 50,
      order: { sendAt: 'ASC' },
    });
    let processed = 0;
    for (const row of due) {
      await this.processRowById(row.id);
      const fresh = await this.repo.findOne({ where: { id: row.id } });
      if (fresh?.sentAt) processed += 1;
    }
    if (processed > 0) {
      this.logger.log(`Cola WhatsApp: ${processed} mensaje(s) enviado(s)`);
    }
    return processed;
  }
}
