import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Account } from './app';
import { createTestApp, signUp } from './app';

type Tag = { id: string; name: string; color: string; promptCount: number };

describe('Tags', () => {
  let app: INestApplication;
  let http: Server;
  let me: Account;

  beforeAll(async () => ({ app, http } = await createTestApp()));
  afterAll(() => app.close());
  beforeEach(async () => (me = await signUp(http)));

  const createTag = async (account: Account, name: string, color = '#8b5cf6'): Promise<Tag> => {
    const res = await request(http)
      .post('/api/tags')
      .auth(account.accessToken, { type: 'bearer' })
      .send({ name, color })
      .expect(201);
    return res.body as Tag;
  };

  describe('POST /api/tags', () => {
    it('creates a tag', async () => {
      const tag = await createTag(me, ' claude ', '#8B5CF6');

      expect(tag).toEqual({ id: tag.id, name: 'claude', color: '#8b5cf6', promptCount: 0 });
    });

    it('refuses a name already used by the same user', async () => {
      await createTag(me, 'claude');

      await request(http)
        .post('/api/tags')
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: 'claude', color: '#000000' })
        .expect(409);
    });

    it('lets two users pick the same name', async () => {
      await createTag(me, 'shared');

      await createTag(await signUp(http), 'shared');
    });

    it.each(['red', '#fff', '#12345g'])('refuses the colour %p', async (color) => {
      await request(http)
        .post('/api/tags')
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: 'bad colour', color })
        .expect(400);
    });
  });

  describe('GET /api/tags', () => {
    it("lists only the current user's tags, by name", async () => {
      await createTag(me, 'zeta');
      await createTag(me, 'alpha');
      await createTag(await signUp(http), 'not mine');

      const res = await request(http)
        .get('/api/tags')
        .auth(me.accessToken, { type: 'bearer' })
        .expect(200);

      expect((res.body as Tag[]).map((t) => t.name)).toEqual(['alpha', 'zeta']);
    });
  });

  describe('PATCH /api/tags/:id', () => {
    it('renames and recolours a tag', async () => {
      const tag = await createTag(me, 'old');

      const res = await request(http)
        .patch(`/api/tags/${tag.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: 'new', color: '#10b981' })
        .expect(200);

      expect(res.body).toMatchObject({ name: 'new', color: '#10b981' });
    });

    it("hides someone else's tag", async () => {
      const theirs = await createTag(await signUp(http), 'theirs');

      await request(http)
        .patch(`/api/tags/${theirs.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: 'hijacked' })
        .expect(404);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('deletes a tag', async () => {
      const tag = await createTag(me, 'temporary');

      await request(http)
        .delete(`/api/tags/${tag.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .expect(204);

      const res = await request(http).get('/api/tags').auth(me.accessToken, { type: 'bearer' });
      expect(res.body).toEqual([]);
    });

    it("hides someone else's tag", async () => {
      const theirs = await createTag(await signUp(http), 'theirs');

      await request(http)
        .delete(`/api/tags/${theirs.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
