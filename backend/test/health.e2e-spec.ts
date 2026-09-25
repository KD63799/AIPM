import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { createTestApp } from './app';

describe('GET /health', () => {
  let app: INestApplication;
  let http: Server;

  beforeAll(async () => ({ app, http } = await createTestApp()));
  afterAll(() => app.close());

  it('answers without the /api prefix', async () => {
    await request(http).get('/health').expect(200, { status: 'ok' });
  });
});
