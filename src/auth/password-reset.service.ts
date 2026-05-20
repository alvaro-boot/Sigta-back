import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PasswordResetCode } from './entities/password-reset-code.entity';
import { UsersService } from '../users/users.service';
import { UltraMsgService } from '../notifications/ultramsg.service';

const GENERIC_SENT_MSG =
  'Si el correo está registrado y tiene WhatsApp vinculado, recibirás un código en unos segundos.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetCode)
    private readonly resetRepo: Repository<PasswordResetCode>,
    private readonly usersService: UsersService,
    private readonly ultraMsg: UltraMsgService,
    private readonly config: ConfigService,
  ) {}

  private ttlMinutes(): number {
    return parseInt(
      this.config.get('PASSWORD_RESET_CODE_TTL_MINUTES', '15'),
      10,
    );
  }

  private generateCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  async requestCode(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      return { message: GENERIC_SENT_MSG };
    }
    if (!user.whatsappPhone?.trim()) {
      throw new BadRequestException(
        'Tu cuenta no tiene WhatsApp registrado. Contacta al administrador para recuperar el acceso.',
      );
    }
    if (!this.ultraMsg.isConfigured()) {
      throw new BadRequestException(
        'El envío por WhatsApp no está configurado en el servidor.',
      );
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.resetRepo.count({
      where: {
        userId: user.id,
        createdAt: MoreThan(since),
      },
    });
    if (recentCount >= 5) {
      throw new BadRequestException(
        'Demasiados intentos. Espera una hora e inténtalo de nuevo.',
      );
    }

    await this.resetRepo.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const plainCode = this.generateCode();
    const codeHash = await bcrypt.hash(plainCode, 10);
    const expiresAt = new Date(Date.now() + this.ttlMinutes() * 60 * 1000);

    await this.resetRepo.save(
      this.resetRepo.create({
        userId: user.id,
        email: user.email,
        codeHash,
        expiresAt,
        usedAt: null,
      }),
    );

    const body =
      `SIGTA · Recuperación de contraseña\n` +
      `Código: ${plainCode}\n` +
      `Válido por ${this.ttlMinutes()} minutos.\n` +
      `Si no solicitaste esto, ignora el mensaje.`;

    const sent = await this.ultraMsg.sendText(user.whatsappPhone, body);
    if (!sent) {
      this.logger.error(`No se pudo enviar código de reset a usuario ${user.id}`);
      throw new BadRequestException(
        'No se pudo enviar el código por WhatsApp. Verifica tu número en perfil o inténtalo más tarde.',
      );
    }

    return { message: GENERIC_SENT_MSG };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Código inválido o expirado');
    }

    const rows = await this.resetRepo.find({
      where: { userId: user.id, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const now = new Date();
    let matched: PasswordResetCode | null = null;
    for (const row of rows) {
      if (row.expiresAt < now) continue;
      const ok = await bcrypt.compare(code, row.codeHash);
      if (ok) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      throw new UnauthorizedException('Código inválido o expirado');
    }

    await this.usersService.update(user.id, { password: newPassword });
    matched.usedAt = new Date();
    await this.resetRepo.save(matched);
    await this.resetRepo.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    return { message: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }
}
