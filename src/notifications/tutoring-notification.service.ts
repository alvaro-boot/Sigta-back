import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { ConfigService } from '@nestjs/config';
import { TutoringRequest } from '../tutorings/entities/tutoring-request.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { SessionModality } from '../common/enums/session-modality.enum';
import { TutoringStatus } from '../common/enums/tutoring-status.enum';
import { NotificationType } from './notification-type.enum';
import { UltraMsgService } from './ultramsg.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { AdminService } from '../admin/admin.service';

const ASSIGN_DELAY_MS = 60_000;

@Injectable()
export class TutoringNotificationService {
  private readonly logger = new Logger(TutoringNotificationService.name);

  constructor(
    @InjectRepository(TutoringRequest)
    private readonly tutoringRepo: Repository<TutoringRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly ultraMsg: UltraMsgService,
    private readonly moduleRef: ModuleRef,
    private readonly adminService: AdminService,
    private readonly config: ConfigService,
  ) {}

  /** Evita dependencia circular con NotificationSchedulerService. */
  private scheduler(): NotificationSchedulerService {
    return this.moduleRef.get(NotificationSchedulerService, { strict: false });
  }

  private tz(): string {
    return this.config.get('APP_TIMEZONE', 'America/Bogota');
  }

  private fmt(d: Date): string {
    return formatInTimeZone(d, this.tz(), "EEEE d MMM yyyy, HH:mm", {
      locale: es,
    });
  }

  private modalityLabel(m: SessionModality): string {
    return m === SessionModality.VIRTUAL ? 'Virtual' : 'Presencial';
  }

  private async loadTutoring(id: number): Promise<TutoringRequest | null> {
    return this.tutoringRepo.findOne({
      where: { id },
      relations: ['subject', 'student', 'professor'],
    });
  }

  private async sendToUser(userId: number, body: string): Promise<void> {
    const u = await this.userRepo.findOne({ where: { id: userId } });
    if (!u) {
      this.logger.warn(`WhatsApp: usuario ${userId} no encontrado`);
      return;
    }
    if (!Boolean(u.whatsappNotifyEnabled)) {
      this.logger.warn(`WhatsApp: usuario ${userId} tiene notificaciones desactivadas`);
      return;
    }
    if (!u.whatsappPhone?.trim()) {
      this.logger.warn(`WhatsApp: usuario ${userId} sin número guardado`);
      return;
    }
    if (!this.ultraMsg.isConfigured()) {
      this.logger.warn('WhatsApp: UltraMsg no configurado (ULTRAMSG_* en .env)');
      return;
    }
    const ok = await this.ultraMsg.sendText(u.whatsappPhone, body);
    if (!ok) {
      this.logger.warn(`WhatsApp: fallo al enviar a usuario ${userId}`);
    }
  }

  private async sendToAdmins(body: string): Promise<void> {
    const admins = await this.userRepo.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    for (const a of admins) {
      if (Boolean(a.whatsappNotifyEnabled) && a.whatsappPhone) {
        await this.ultraMsg.sendText(a.whatsappPhone, body);
      }
    }
  }

  private async cancelReminders(tutoringId: number): Promise<void> {
    await this.scheduler().cancelForTutoring(tutoringId);
  }

  /** Tras crear solicitud con docente asignado (pendiente confirmación). */
  async onStudentRequestCreated(tutoringId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t) return;

    await this.sendToUser(
      t.studentId,
      `SIGTA · Solicitud recibida\n` +
        `Materia: ${t.subject?.name ?? '—'}\n` +
        `Modalidad: ${this.modalityLabel(t.modality)}\n` +
        `Inicio: ${this.fmt(t.startAt)}\n` +
        `Duración: 1 hora.\n` +
        (t.professor
          ? `Estamos asignando a ${t.professor.fullName}; te avisaremos en breve.`
          : `Buscando docente disponible.`),
    );

    if (t.professorId) {
      await this.scheduler().schedule({
        tutoringRequestId: t.id,
        recipientUserId: t.studentId,
        type: NotificationType.STUDENT_PROFESSOR_ASSIGNED,
        sendAt: new Date(Date.now() + ASSIGN_DELAY_MS),
      });
      await this.onProfessorAssigned(t.id);
    }
  }

  /** Notifica al estudiante (con retraso programado) y al docente. */
  async onProfessorAssigned(tutoringId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t?.professorId || !t.professor) return;

    const prof = t.professor;
    const subj = t.subject?.name ?? '—';
    const when = this.fmt(t.startAt);
    const mod = this.modalityLabel(t.modality);

    let profMsg =
      `SIGTA · Nueva tutoría asignada\n` +
      `Estudiante: ${t.student?.fullName ?? '—'}\n` +
      `Materia: ${subj}\n` +
      `Modalidad: ${mod}\n` +
      `Inicio: ${when}\n`;
    if (t.studentTopic) profMsg += `Tema: ${t.studentTopic}\n`;
    if (t.modality === SessionModality.IN_PERSON) {
      profMsg += prof.officeLocation
        ? `Lugar: ${prof.officeLocation}\n`
        : `Modalidad presencial. Indica ubicación al estudiante si aún no está en tu perfil.\n`;
    } else {
      if (prof.virtualMeetingUrl) {
        profMsg += `Enlace: ${prof.virtualMeetingUrl}\n`;
      } else {
        profMsg += `⚠ Sesión VIRTUAL: añade el enlace de reunión en tu perfil SIGTA antes de confirmar.\n`;
      }
    }
    profMsg += `Confirma o devuelve la solicitud en el panel de profesor.`;
    await this.sendToUser(prof.id, profMsg);
  }

  /** Mensaje diferido al estudiante tras ~1 min de asignación. */
  async sendStudentAssignedDelayed(tutoringId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t || t.status === TutoringStatus.CANCELLED) return;
    if (!t.professor) return;

    await this.sendToUser(
      t.studentId,
      `SIGTA · Docente asignado\n` +
        `Profesor: ${t.professor.fullName}\n` +
        `Materia: ${t.subject?.name ?? '—'}\n` +
        `Modalidad: ${this.modalityLabel(t.modality)}\n` +
        `Inicio: ${this.fmt(t.startAt)}\n` +
        `Estado: pendiente de confirmación del docente. Te avisaremos cuando acepte.`,
    );
  }

  async onProfessorConfirmed(tutoringId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t?.professor) return;

    let studentMsg =
      `SIGTA · Tutoría confirmada\n` +
      `Profesor: ${t.professor.fullName}\n` +
      `Materia: ${t.subject?.name ?? '—'}\n` +
      `Inicio: ${this.fmt(t.startAt)}\n` +
      `Modalidad: ${this.modalityLabel(t.modality)}\n`;
    if (t.modality === SessionModality.VIRTUAL && t.professor.virtualMeetingUrl) {
      studentMsg += `Enlace: ${t.professor.virtualMeetingUrl}\n`;
    } else if (t.modality === SessionModality.IN_PERSON && t.professor.officeLocation) {
      studentMsg += `Lugar: ${t.professor.officeLocation}\n`;
    }
    await this.sendToUser(t.studentId, studentMsg);

    await this.scheduleReminders(t.id);
  }

  /** Profesor tomó solicitud de la cola UNASSIGNED. */
  async onProfessorClaimed(tutoringId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t?.professorId) return;
    await this.scheduler().schedule({
      tutoringRequestId: t.id,
      recipientUserId: t.studentId,
      type: NotificationType.STUDENT_PROFESSOR_ASSIGNED,
      sendAt: new Date(Date.now() + ASSIGN_DELAY_MS),
    });
    await this.onProfessorAssigned(tutoringId);
  }

  async onUnassignedNeedsAdmin(tutoringId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t) return;
    await this.cancelReminders(tutoringId);

    await this.sendToAdmins(
      `SIGTA · Asignación manual requerida\n` +
        `Solicitud #${t.id} sin docente.\n` +
        `Estudiante: ${t.student?.fullName ?? '—'}\n` +
        `Materia: ${t.subject?.name ?? '—'}\n` +
        `Inicio: ${this.fmt(t.startAt)}\n` +
        `Modalidad: ${this.modalityLabel(t.modality)}\n` +
        `Revisa la cola en el sistema o asigna un profesor.`,
    );
  }

  async onCancelled(tutoringId: number): Promise<void> {
    await this.cancelReminders(tutoringId);
  }

  private async scheduleReminders(tutoringId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t || t.status !== TutoringStatus.CONFIRMED) return;

    const minH = await this.adminService.getNumber(
      'tutoring_cancel_min_hours_before',
      24,
    );
    const start = t.startAt.getTime();
    const now = Date.now();
    const offsets = [
      { type: NotificationType.STUDENT_REMINDER_3D, ms: 3 * 24 * 60 * 60 * 1000 },
      { type: NotificationType.STUDENT_REMINDER_1D, ms: 24 * 60 * 60 * 1000 },
      { type: NotificationType.STUDENT_REMINDER_1H, ms: 60 * 60 * 1000 },
    ];
    const profOffsets = [
      { type: NotificationType.PROFESSOR_REMINDER_3D, ms: 3 * 24 * 60 * 60 * 1000 },
      { type: NotificationType.PROFESSOR_REMINDER_1D, ms: 24 * 60 * 60 * 1000 },
      { type: NotificationType.PROFESSOR_REMINDER_1H, ms: 60 * 60 * 1000 },
    ];

    for (const o of offsets) {
      const sendAt = new Date(start - o.ms);
      if (sendAt.getTime() > now) {
        await this.scheduler().schedule({
          tutoringRequestId: t.id,
          recipientUserId: t.studentId,
          type: o.type,
          sendAt,
        });
      }
    }
    if (t.professorId) {
      for (const o of profOffsets) {
        const sendAt = new Date(start - o.ms);
        if (sendAt.getTime() > now) {
          await this.scheduler().schedule({
            tutoringRequestId: t.id,
            recipientUserId: t.professorId,
            type: o.type,
            sendAt,
          });
        }
      }
    }

    this.logger.log(`Recordatorios programados para tutoría #${tutoringId}`);
  }

  async processScheduled(type: NotificationType, tutoringId: number, userId: number): Promise<void> {
    const t = await this.loadTutoring(tutoringId);
    if (!t) return;
    if (
      t.status === TutoringStatus.CANCELLED ||
      t.status === TutoringStatus.COMPLETED
    ) {
      return;
    }
    if (type === NotificationType.STUDENT_PROFESSOR_ASSIGNED) {
      await this.sendStudentAssignedDelayed(tutoringId);
      return;
    }

    const minH = await this.adminService.getNumber(
      'tutoring_cancel_min_hours_before',
      24,
    );
    const when = this.fmt(t.startAt);
    const subj = t.subject?.name ?? '—';

    const studentCancelHint = `Si ya no necesitas la sesión, anúlala en SIGTA con al menos ${minH} h de anticipación.`;

    switch (type) {
      case NotificationType.STUDENT_REMINDER_3D:
        await this.sendToUser(
          userId,
          `SIGTA · Recordatorio (3 días)\nTutoría de ${subj} el ${when}.\n${studentCancelHint}`,
        );
        break;
      case NotificationType.STUDENT_REMINDER_1D:
        await this.sendToUser(
          userId,
          `SIGTA · Recordatorio (mañana)\nTutoría de ${subj} el ${when}.\n${studentCancelHint}`,
        );
        break;
      case NotificationType.STUDENT_REMINDER_1H:
        await this.sendToUser(
          userId,
          `SIGTA · Recordatorio (1 hora)\nTutoría de ${subj} a las ${when}.\n${studentCancelHint}`,
        );
        break;
      case NotificationType.PROFESSOR_REMINDER_3D:
        await this.sendToUser(
          userId,
          `SIGTA · Recordatorio (3 días)\nTutoría con ${t.student?.fullName ?? 'estudiante'} · ${subj} el ${when}.`,
        );
        break;
      case NotificationType.PROFESSOR_REMINDER_1D:
        await this.sendToUser(
          userId,
          `SIGTA · Recordatorio (mañana)\nTutoría con ${t.student?.fullName ?? 'estudiante'} · ${subj} el ${when}.`,
        );
        break;
      case NotificationType.PROFESSOR_REMINDER_1H:
        await this.sendToUser(
          userId,
          `SIGTA · Recordatorio (1 hora)\nTutoría con ${t.student?.fullName ?? 'estudiante'} · ${subj} a las ${when}.`,
        );
        break;
      default:
        break;
    }
  }
}
