import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';
import type { Env } from './config/env';

/** Shared by `main.ts` and the e2e tests so both run the exact same HTTP pipeline. */
export function setupApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);

  app.use(cookieParser());
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }), credentials: true });
}
