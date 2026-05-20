import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app-bootstrap';

const expressApp = express();
let ready = false;

async function bootstrap(): Promise<void> {
  if (ready) return;
  const nest = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] },
  );
  configureApp(nest);
  await nest.init();
  ready = true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  try {
    await bootstrap();
    return new Promise((resolve, reject) => {
      // VercelRequest/Response son compatibles con Express en runtime
      expressApp(req as never, res as never, (err: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (e) {
    console.error('SIGTA bootstrap error:', e);
    res.status(500).json({
      statusCode: 500,
      message:
        'Error al iniciar el servidor. Revise variables de entorno (DB_*, JWT_SECRET) en Vercel.',
    });
  }
}
