import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

/**
 * Shared by `main.ts` and the e2e tests so both run the exact same HTTP pipeline.
 * The SPA reaches the API on the same origin (`/api` proxied), hence no CORS.
 */
export function setupApp(app: NestExpressApplication): void {
  // Behind nginx / an ingress on a private network: trust their X-Forwarded-Proto.
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(cookieParser());
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
}
