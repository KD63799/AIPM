import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Account } from './app';
import { createTestApp, signUp } from './app';

type Library = {
  format: string;
  version: number;
  exportedAt: string;
  folders: { path: string[] }[];
  tags: { name: string; color: string }[];
  prompts: {
    title: string;
    description: string | null;
    content: string;
    folder: string[] | null;
    tags: string[];
    isFavorite: boolean;
    variables: { name: string; defaultValue: string | null; description: string | null }[];
  }[];
};

describe('Export / import', () => {
  let app: INestApplication;
  let http: Server;
  let me: Account;

  beforeAll(async () => ({ app, http } = await createTestApp()));
  afterAll(() => app.close());
  beforeEach(async () => (me = await signUp(http)));

  const as = (account: Account) => ({
    get: (url: string) => request(http).get(url).auth(account.accessToken, { type: 'bearer' }),
    post: (url: string) => request(http).post(url).auth(account.accessToken, { type: 'bearer' }),
  });

  /** Dev > Review folders, a `claude` tag, one filed prompt and one loose prompt. */
  const seedLibrary = async (account: Account): Promise<void> => {
    const dev = await as(account).post('/api/folders').send({ name: 'Dev' }).expect(201);
    const review = await as(account)
      .post('/api/folders')
      .send({ name: 'Review', parentId: (dev.body as { id: string }).id })
      .expect(201);
    const tag = await as(account)
      .post('/api/tags')
      .send({ name: 'claude', color: '#8b5cf6' })
      .expect(201);
    await as(account)
      .post('/api/prompts')
      .send({
        title: 'Code review',
        description: 'Strict',
        content: 'Review this {{language}} code:\n```\n{{code}}\n```',
        folderId: (review.body as { id: string }).id,
        tagIds: [(tag.body as { id: string }).id],
        isFavorite: true,
        variables: [{ name: 'language', defaultValue: 'TypeScript' }],
      })
      .expect(201);
    await as(account)
      .post('/api/prompts')
      .send({ title: 'Loose', content: 'No folder' })
      .expect(201);
  };

  const exportLibrary = async (account: Account): Promise<Library> =>
    (await as(account).get('/api/export').expect(200)).body as Library;

  describe('GET /api/export', () => {
    it('describes folders by path and tags by name', async () => {
      await seedLibrary(me);
      await seedLibrary(await signUp(http));

      const library = await exportLibrary(me);

      expect(library).toMatchObject({
        format: 'ai-prompt-manager',
        version: 1,
        folders: [{ path: ['Dev'] }, { path: ['Dev', 'Review'] }],
        tags: [{ name: 'claude', color: '#8b5cf6' }],
      });
      expect(library.prompts).toContainEqual({
        title: 'Code review',
        description: 'Strict',
        content: 'Review this {{language}} code:\n```\n{{code}}\n```',
        folder: ['Dev', 'Review'],
        tags: ['claude'],
        isFavorite: true,
        variables: [
          { name: 'language', defaultValue: 'TypeScript', description: null },
          { name: 'code', defaultValue: null, description: null },
        ],
      });
      expect(library.prompts).toHaveLength(2);
    });
  });

  describe('GET /api/export/markdown', () => {
    it('renders a readable document, fencing contents safely', async () => {
      await seedLibrary(me);

      const res = await as(me).get('/api/export/markdown').expect(200);

      expect(res.type).toBe('text/markdown');
      expect(res.text).toContain('## Dev / Review');
      expect(res.text).toContain('### Code review');
      expect(res.text).toContain(
        '````text\nReview this {{language}} code:\n```\n{{code}}\n```\n````',
      );
    });
  });

  describe('POST /api/import', () => {
    it('recreates a library exported from another account', async () => {
      await seedLibrary(me);
      const exported = await exportLibrary(me);
      const other = await signUp(http);

      const res = await as(other).post('/api/import').send(exported).expect(201);

      expect(res.body).toEqual({ folders: 2, tags: 1, prompts: 2 });
      const reimported = await exportLibrary(other);
      expect({ ...reimported, exportedAt: null }).toEqual({ ...exported, exportedAt: null });
    });

    it('merges into existing folders and tags', async () => {
      await seedLibrary(me);
      const exported = await exportLibrary(me);

      const res = await as(me).post('/api/import').send(exported).expect(201);

      expect(res.body).toEqual({ folders: 0, tags: 0, prompts: 2 });
      const library = await exportLibrary(me);
      expect(library.folders).toHaveLength(2);
      expect(library.prompts).toHaveLength(4);
    });

    it('creates tags only referenced by a prompt', async () => {
      await as(me)
        .post('/api/import')
        .send({
          format: 'ai-prompt-manager',
          version: 1,
          folders: [],
          tags: [],
          prompts: [{ title: 'T', content: 'C', folder: ['New'], tags: ['fresh'] }],
        })
        .expect(201);

      const library = await exportLibrary(me);
      expect(library.tags).toMatchObject([{ name: 'fresh' }]);
      expect(library.folders).toEqual([{ path: ['New'] }]);
    });

    it('accepts libraries well past the default 100kb body limit', async () => {
      const prompts = Array.from({ length: 60 }, (_, i) => ({
        title: `Long ${i}`,
        content: 'x'.repeat(5000),
      }));

      await as(me)
        .post('/api/import')
        .send({ format: 'ai-prompt-manager', version: 1, folders: [], tags: [], prompts })
        .expect(201);
    });

    it.each([
      { format: 'something-else', version: 1, folders: [], tags: [], prompts: [] },
      { format: 'ai-prompt-manager', version: 2, folders: [], tags: [], prompts: [] },
      { format: 'ai-prompt-manager', version: 1, folders: [], tags: [], prompts: [{ title: 'x' }] },
    ])('rejects a malformed document %#', async (document) => {
      await as(me).post('/api/import').send(document).expect(400);
    });
  });
});
