import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { Response } from 'supertest';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

export type User = { id: string; email: string; createdAt: string };
export type AuthBody = { accessToken: string; user: User };
export type Account = AuthBody & { email: string; password: string; cookie: string };

export async function createTestApp(): Promise<{ app: INestApplication; http: Server }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  setupApp(app);
  await app.init();
  return { app, http: app.getHttpServer() };
}

export function uniqueEmail(): string {
  return `${randomUUID()}@test.local`;
}

/** The `refresh_token=<value>` pair set by the response, ready for a `Cookie` header. */
export function refreshCookie(res: Response): string {
  const cookie = res.get('Set-Cookie')?.find((c) => c.startsWith('refresh_token='));
  if (!cookie) throw new Error('response did not set a refresh cookie');
  return cookie.split(';')[0];
}

export async function signUp(http: Server): Promise<Account> {
  const email = uniqueEmail();
  const password = 'correct horse battery';
  const res = await request(http).post('/api/auth/register').send({ email, password }).expect(201);
  return { ...(res.body as AuthBody), email, password, cookie: refreshCookie(res) };
}
