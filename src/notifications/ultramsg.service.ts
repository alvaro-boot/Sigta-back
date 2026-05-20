import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizeWhatsAppPhone } from './phone.util';

@Injectable()
export class UltraMsgService {
  private readonly logger = new Logger(UltraMsgService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get('ULTRAMSG_INSTANCE_ID') &&
        this.config.get('ULTRAMSG_TOKEN'),
    );
  }

  async sendText(toRaw: string, body: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('UltraMsg no configurado; mensaje no enviado');
      return false;
    }
    const to = normalizeWhatsAppPhone(toRaw);
    if (!to) {
      this.logger.warn(`Teléfono inválido: ${toRaw}`);
      return false;
    }
    const instanceId = this.config.get<string>('ULTRAMSG_INSTANCE_ID')!;
    const token = this.config.get<string>('ULTRAMSG_TOKEN')!;
    const base =
      this.config.get<string>('ULTRAMSG_API_URL')?.replace(/\/$/, '') ||
      `https://api.ultramsg.com/${instanceId}`;
    const url = `${base}/messages/chat`;

    try {
      const params = new URLSearchParams();
      params.set('token', token);
      params.set('to', to);
      params.set('body', body);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const text = await res.text();
      if (!res.ok) {
        this.logger.error(`UltraMsg ${res.status}: ${text}`);
        return false;
      }
      this.logger.log(`WhatsApp enviado a ${to}`);
      return true;
    } catch (e) {
      this.logger.error('UltraMsg error', e);
      return false;
    }
  }
}
