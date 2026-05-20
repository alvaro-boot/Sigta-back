/**
 * Prueba de envío WhatsApp (UltraMsg). Uso:
 *   npm run whatsapp:test -- 3001234567
 *   npm run whatsapp:test -- +573001234567
 */
import 'dotenv/config';
import * as https from 'https';
import * as querystring from 'querystring';

const instanceId = (process.env.ULTRAMSG_INSTANCE_ID ?? '').trim();
const token = (process.env.ULTRAMSG_TOKEN ?? '').trim();
const toArg = process.argv[2];

if (!instanceId || !token) {
  console.error('Faltan ULTRAMSG_INSTANCE_ID o ULTRAMSG_TOKEN en .env');
  process.exit(1);
}

if (!toArg) {
  console.error('Uso: npm run whatsapp:test -- <telefono>');
  console.error('Ejemplo: npm run whatsapp:test -- 3001234567');
  process.exit(1);
}

let digits = toArg.replace(/\D/g, '');
if (digits.length === 10 && digits.startsWith('3')) digits = `57${digits}`;

const postData = querystring.stringify({
  token,
  to: digits,
  body: 'SIGTA · Prueba de WhatsApp. Si recibes esto, UltraMsg está bien configurado.',
});

const path = `/${instanceId}/messages/chat`;

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
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      console.log('HTTP', res.statusCode);
      console.log(body);
      if (body.includes('"sent":"true"') || body.includes('"sent":true')) {
        console.log('\nOK — mensaje aceptado por UltraMsg.');
      } else if (/wrong token/i.test(body)) {
        console.error(
          '\nEl TOKEN no coincide con la instancia. En ultramsg.com abre',
          instanceId,
          'y copia el API Token a ULTRAMSG_TOKEN en .env',
        );
        process.exit(1);
      } else {
        process.exit(1);
      }
    });
  },
);

req.on('error', (e) => {
  console.error(e);
  process.exit(1);
});

req.write(postData);
req.end();
