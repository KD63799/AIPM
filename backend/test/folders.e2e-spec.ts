import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Account } from './app';
import { createTestApp, signUp } from './app';

type Folder = { id: string; name: string; parentId: string | null; promptCount: number };

describe('Folders', () => {
  let app: INestApplication;
  let http: Server;
  let me: Account;

  beforeAll(async () => ({ app, http } = await createTestApp()));
  afterAll(() => app.close());
  beforeEach(async () => (me = await signUp(http)));

  const createFolder = async (
    account: Account,
    body: { name: string; parentId?: string | null },
  ): Promise<Folder> => {
    const res = await request(http)
      .post('/api/folders')
      .auth(account.accessToken, { type: 'bearer' })
      .send(body)
      .expect(201);
    return res.body as Folder;
  };

  const listFolders = async (account: Account): Promise<Folder[]> => {
    const res = await request(http)
      .get('/api/folders')
      .auth(account.accessToken, { type: 'bearer' })
      .expect(200);
    return res.body as Folder[];
  };

  describe('POST /api/folders', () => {
    it('creates a root folder', async () => {
      const folder = await createFolder(me, { name: '  Rédaction ' });

      expect(folder).toEqual({ id: folder.id, name: 'Rédaction', parentId: null, promptCount: 0 });
    });

    it('creates a sub-folder', async () => {
      const parent = await createFolder(me, { name: 'Dev' });

      const child = await createFolder(me, { name: 'Revue', parentId: parent.id });

      expect(child.parentId).toBe(parent.id);
    });

    it("refuses someone else's folder as parent", async () => {
      const theirs = await createFolder(await signUp(http), { name: 'Theirs' });

      await request(http)
        .post('/api/folders')
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: 'Mine', parentId: theirs.id })
        .expect(404);
    });

    it('refuses an empty name', async () => {
      await request(http)
        .post('/api/folders')
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: '   ' })
        .expect(400);
    });
  });

  describe('GET /api/folders', () => {
    it("lists only the current user's folders, by name", async () => {
      await createFolder(me, { name: 'Zeta' });
      await createFolder(me, { name: 'Alpha' });
      await createFolder(await signUp(http), { name: 'Not mine' });

      const names = (await listFolders(me)).map((f) => f.name);

      expect(names).toEqual(['Alpha', 'Zeta']);
    });
  });

  describe('PATCH /api/folders/:id', () => {
    it('renames a folder', async () => {
      const folder = await createFolder(me, { name: 'Old' });

      const res = await request(http)
        .patch(`/api/folders/${folder.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: 'New' })
        .expect(200);

      expect((res.body as Folder).name).toBe('New');
    });

    it('moves a folder back to the root', async () => {
      const parent = await createFolder(me, { name: 'Parent' });
      const child = await createFolder(me, { name: 'Child', parentId: parent.id });

      const res = await request(http)
        .patch(`/api/folders/${child.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .send({ parentId: null })
        .expect(200);

      expect((res.body as Folder).parentId).toBeNull();
    });

    it('refuses to move a folder under one of its descendants', async () => {
      const root = await createFolder(me, { name: 'Root' });
      const child = await createFolder(me, { name: 'Child', parentId: root.id });
      const grandChild = await createFolder(me, { name: 'Grand child', parentId: child.id });

      await request(http)
        .patch(`/api/folders/${root.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .send({ parentId: grandChild.id })
        .expect(400);
    });

    it('refuses to move a folder under itself', async () => {
      const folder = await createFolder(me, { name: 'Loop' });

      await request(http)
        .patch(`/api/folders/${folder.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .send({ parentId: folder.id })
        .expect(400);
    });

    it("hides someone else's folder", async () => {
      const theirs = await createFolder(await signUp(http), { name: 'Theirs' });

      await request(http)
        .patch(`/api/folders/${theirs.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .send({ name: 'Hijacked' })
        .expect(404);
    });
  });

  describe('DELETE /api/folders/:id', () => {
    it('deletes the folder and lifts its sub-folders to its parent', async () => {
      const root = await createFolder(me, { name: 'Root' });
      const middle = await createFolder(me, { name: 'Middle', parentId: root.id });
      const leaf = await createFolder(me, { name: 'Leaf', parentId: middle.id });

      await request(http)
        .delete(`/api/folders/${middle.id}`)
        .auth(me.accessToken, { type: 'bearer' })
        .expect(204);

      const folders = await listFolders(me);
      expect(folders.map((f) => f.id)).not.toContain(middle.id);
      expect(folders.find((f) => f.id === leaf.id)?.parentId).toBe(root.id);
    });

    it('answers 404 for an unknown folder', async () => {
      await request(http)
        .delete(`/api/folders/${randomUUID()}`)
        .auth(me.accessToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
