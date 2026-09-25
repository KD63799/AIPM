import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';

export async function createTestApp(): Promise<{ app: INestApplication; http: Server }> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  setupApp(app);
  await app.init();
  return { app, http: app.getHttpServer() as Server };
}
