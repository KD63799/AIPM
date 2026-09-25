import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { AuthBody } from './app';
import { createTestApp, refreshCookie, signUp, uniqueEmail } from './app';

describe('Auth', () => {
  let app: INestApplication;
  let http: Server;

  beforeAll(async () => ({ app, http } = await createTestApp()));
  afterAll(() => app.close());

  describe('POST /api/auth/register', () => {
    it('creates the account and opens a session', async () => {
      const email = uniqueEmail();

      const res = await request(http)
        .post('/api/auth/register')
        .send({ email, password: 'long enough' })
        .expect(201);

      const body = res.body as AuthBody;
      expect(body.user.email).toBe(email);
      expect(body.accessToken).toEqual(expect.any(String));
      expect(res.get('Set-Cookie')?.[0]).toMatch(/HttpOnly/);
    });

    it('normalises the email', async () => {
      const email = uniqueEmail();

      const res = await request(http)
        .post('/api/auth/register')
        .send({ email: `  ${email.toUpperCase()} `, password: 'long enough' })
        .expect(201);

      expect((res.body as AuthBody).user.email).toBe(email);
    });

    it('refuses an email already in use', async () => {
      const { email } = await signUp(http);

      await request(http)
        .post('/api/auth/register')
        .send({ email, password: 'long enough' })
        .expect(409);
    });

    it.each([
      { email: 'not-an-email', password: 'long enough' },
      { email: 'short@test.local', password: 'short' },
      { email: 'extra@test.local', password: 'long enough', role: 'admin' },
    ])('rejects invalid input %p', async (payload) => {
      await request(http).post('/api/auth/register').send(payload).expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('opens a session with the right password', async () => {
      const { email, password, user } = await signUp(http);

      const res = await request(http).post('/api/auth/login').send({ email, password }).expect(200);

      expect((res.body as AuthBody).user.id).toBe(user.id);
    });

    it('refuses a wrong password', async () => {
      const { email } = await signUp(http);

      await request(http)
        .post('/api/auth/login')
        .send({ email, password: 'wrong password' })
        .expect(401);
    });

    it('refuses an unknown email the same way', async () => {
      await request(http)
        .post('/api/auth/login')
        .send({ email: uniqueEmail(), password: 'whatever it is' })
        .expect(401);
    });

    it('throttles repeated attempts on the same account', async () => {
      const { email } = await signUp(http);
      for (let attempt = 0; attempt < 5; attempt++) {
        await request(http).post('/api/auth/login').send({ email, password: 'wrong password' });
      }

      await request(http)
        .post('/api/auth/login')
        .send({ email, password: 'wrong password' })
        .expect(429);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a new access token and rotates the cookie', async () => {
      const account = await signUp(http);

      const res = await request(http)
        .post('/api/auth/refresh')
        .set('Cookie', account.cookie)
        .expect(200);

      expect((res.body as AuthBody).user.id).toBe(account.user.id);
      expect(refreshCookie(res)).not.toBe(account.cookie);
    });

    it('refuses a cookie that was already used', async () => {
      const { cookie } = await signUp(http);
      await request(http).post('/api/auth/refresh').set('Cookie', cookie).expect(200);

      await request(http).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
    });

    it('refuses a request without cookie', async () => {
      await request(http).post('/api/auth/refresh').expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ends the session', async () => {
      const { cookie } = await signUp(http);

      await request(http).post('/api/auth/logout').set('Cookie', cookie).expect(204);

      await request(http).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
    });
  });

  describe('PATCH /api/auth/password', () => {
    it('changes the password and signs out the other sessions', async () => {
      const account = await signUp(http);
      const otherDevice = await request(http)
        .post('/api/auth/login')
        .send({ email: account.email, password: account.password });

      const res = await request(http)
        .patch('/api/auth/password')
        .auth(account.accessToken, { type: 'bearer' })
        .send({ currentPassword: account.password, newPassword: 'a brand new one' })
        .expect(204);

      await request(http)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie(otherDevice))
        .expect(401);
      await request(http).post('/api/auth/refresh').set('Cookie', refreshCookie(res)).expect(200);
      await request(http)
        .post('/api/auth/login')
        .send({ email: account.email, password: 'a brand new one' })
        .expect(200);
    });

    it('requires the current password', async () => {
      const account = await signUp(http);

      await request(http)
        .patch('/api/auth/password')
        .auth(account.accessToken, { type: 'bearer' })
        .send({ currentPassword: 'not my password', newPassword: 'a brand new one' })
        .expect(400);
    });
  });

  describe('access token', () => {
    it('is required on protected routes', async () => {
      await request(http).get('/api/users/me').expect(401);
    });

    it('rejects a forged token', async () => {
      await request(http)
        .get('/api/users/me')
        .auth('forged.token.value', { type: 'bearer' })
        .expect(401);
    });
  });
});
