import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { User } from './app';
import { createTestApp, signUp } from './app';

describe('Users', () => {
  let app: INestApplication;
  let http: Server;

  beforeAll(async () => ({ app, http } = await createTestApp()));
  afterAll(() => app.close());

  describe('GET /api/users/me', () => {
    it('returns the current user without secrets', async () => {
      const account = await signUp(http);

      const res = await request(http)
        .get('/api/users/me')
        .auth(account.accessToken, { type: 'bearer' })
        .expect(200);

      expect(res.body).toEqual<User>({
        id: account.user.id,
        email: account.email,
        createdAt: expect.any(String) as string,
      });
    });
  });

  describe('DELETE /api/users/me', () => {
    it('deletes the account once the password is confirmed', async () => {
      const account = await signUp(http);

      await request(http)
        .delete('/api/users/me')
        .auth(account.accessToken, { type: 'bearer' })
        .send({ password: account.password })
        .expect(204);

      await request(http)
        .post('/api/auth/login')
        .send({ email: account.email, password: account.password })
        .expect(401);
      await request(http).post('/api/auth/refresh').set('Cookie', account.cookie).expect(401);
    });

    it('keeps the account when the password is wrong', async () => {
      const account = await signUp(http);

      await request(http)
        .delete('/api/users/me')
        .auth(account.accessToken, { type: 'bearer' })
        .send({ password: 'not my password' })
        .expect(400);
    });
  });
});
