import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as https from 'https';
import * as querystring from 'querystring';
import { normalizeWhatsAppPhone } from './phone.util';

interface UltraMsgResponse {
  sent?: boolean | string;
  message?: string;
  id?: number;
  error?: string;
}

/** Comprueba éxito según documentación UltraMsg: {"sent":"true","message":"ok","id":...} */
function isUltraMsgSuccess(
  statusCode: number,
  payload: UltraMsgResponse | null,
): boolean {
  if (statusCode < 200 || statusCode >= 300) return false;
  if (!payload) return false;
  if (payload.error) return false;
  const sent = payload.sent;
  return sent === true || sent === 'true';
}

@Injectable()
export class UltraMsgService {
  private readonly logger = new Logger(UltraMsgService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.instanceId() && this.token());
  }

  private instanceId(): string {
    return (this.config.get<string>('ULTRAMSG_INSTANCE_ID') ?? '').trim();
  }

  private token(): string {
    return (this.config.get<string>('ULTRAMSG_TOKEN') ?? '').trim();
  }

  /**
   * Envía mensaje de texto vía UltraMsg (mismo protocolo que el panel oficial).
   * POST https://api.ultramsg.com/{instance}/messages/chat
   * Body: application/x-www-form-urlencoded con token, to, body
   */
  async sendText(toRaw: string, body: string): Promise<boolean> {
    const instanceId = this.instanceId();
    const token = this.token();

    if (!instanceId || !token) {
      this.logger.warn('UltraMsg no configurado (ULTRAMSG_INSTANCE_ID / ULTRAMSG_TOKEN en .env)');
      return false;
    }

    const digits = normalizeWhatsAppPhone(toRaw);
    if (!digits) {
      this.logger.warn(`Teléfono inválido: ${toRaw}`);
      return false;
    }

    /** UltraMsg acepta +57300… o 57300…; usamos E.164 sin + (como ejemplos oficiales). */
    const to = digits;

    try {
      const { statusCode, payload, raw } = await this.postChat(
        instanceId,
        token,
        to,
        body,
      );

      if (isUltraMsgSuccess(statusCode, payload)) {
        this.logger.log(
          `WhatsApp enviado a ${to}${payload?.id != null ? ` (id ${payload.id})` : ''}`,
        );
        return true;
      }

      const errMsg = payload?.error ?? payload?.message ?? raw;
      if (
        typeof errMsg === 'string' &&
        /wrong token/i.test(errMsg)
      ) {
        this.logger.error(
          `UltraMsg: token inválido para la instancia "${instanceId}". ` +
            'Copia el token exacto desde el panel UltraMsg → tu instancia → API.',
        );
      } else {
        this.logger.error(
          `UltraMsg ${statusCode} → ${to}: ${errMsg}`,
        );
      }
      return false;
    } catch (e) {
      this.logger.error('UltraMsg error de red', e);
      return false;
    }
  }

  /** Petición HTTPS como en la documentación oficial de UltraMsg (Node.js). */
  private postChat(
    instanceId: string,
    token: string,
    to: string,
    body: string,
  ): Promise<{
    statusCode: number;
    payload: UltraMsgResponse | null;
    raw: string;
  }> {
    const postData = querystring.stringify({ token, to, body });
    const path = `/${instanceId}/messages/chat`;

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          method: 'POST',
          hostname: 'api.ultramsg.com',
          path,
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8');
            let payload: UltraMsgResponse | null = null;
            try {
              payload = JSON.parse(raw) as UltraMsgResponse;
            } catch {
              /* respuesta no JSON */
            }
            resolve({
              statusCode: res.statusCode ?? 0,
              payload,
              raw,
            });
          });
        },
      );

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}
