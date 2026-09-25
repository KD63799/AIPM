import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Account } from './app';
import { createTestApp, signUp } from './app';

type Variable = { name: string; defaultValue: string | null; description: string | null };
type Prompt = {
  id: string;
  title: string;
  description: string | null;
  content: string;
  folderId: string | null;
  isFavorite: boolean;
  usageCount: number;
  lastUsedAt: string | null;
  version: number;
  tags: { id: string; name: string; color: string }[];
  variables: Variable[];
};
type Version = { versionNumber: number; title: string; content: string; createdAt: string };
type PromptInput = Partial<Omit<Prompt, 'id' | 'tags' | 'variables'>> & {
  tagIds?: string[];
  variables?: Partial<Variable>[];
};

describe('Prompts', () => {
  let app: INestApplication;
  let http: Server;
  let me: Account;

  beforeAll(async () => ({ app, http } = await createTestApp()));
  afterAll(() => app.close());
  beforeEach(async () => (me = await signUp(http)));

  const as = (account: Account) => ({
    get: (url: string) => request(http).get(url).auth(account.accessToken, { type: 'bearer' }),
    post: (url: string) => request(http).post(url).auth(account.accessToken, { type: 'bearer' }),
    patch: (url: string) => request(http).patch(url).auth(account.accessToken, { type: 'bearer' }),
    delete: (url: string) =>
      request(http).delete(url).auth(account.accessToken, { type: 'bearer' }),
  });

  const createPrompt = async (account: Account, input: PromptInput = {}): Promise<Prompt> => {
    const res = await as(account)
      .post('/api/prompts')
      .send({ title: 'A prompt', content: 'Some content', ...input })
      .expect(201);
    return res.body as Prompt;
  };

  const createTag = async (account: Account, name: string): Promise<string> => {
    const res = await as(account).post('/api/tags').send({ name, color: '#8b5cf6' }).expect(201);
    return (res.body as { id: string }).id;
  };

  const createFolder = async (account: Account, name: string): Promise<string> => {
    const res = await as(account).post('/api/folders').send({ name }).expect(201);
    return (res.body as { id: string }).id;
  };

  const listTitles = async (query: string): Promise<string[]> => {
    const res = await as(me).get(`/api/prompts${query}`).expect(200);
    return (res.body as Prompt[]).map((p) => p.title);
  };

  describe('POST /api/prompts', () => {
    it('creates a prompt with its variables in order of appearance, as version 1', async () => {
      const prompt = await createPrompt(me, {
        title: 'Review',
        content: 'Review this {{language}} code: {{code}}. Be strict about {{ language }}.',
      });

      expect(prompt).toMatchObject({
        title: 'Review',
        version: 1,
        isFavorite: false,
        usageCount: 0,
        variables: [
          { name: 'language', defaultValue: null, description: null },
          { name: 'code', defaultValue: null, description: null },
        ],
      });
    });

    it('keeps defaults of detected variables only', async () => {
      const prompt = await createPrompt(me, {
        content: 'Write in {{tone}}',
        variables: [
          { name: 'tone', defaultValue: 'formal', description: 'Register' },
          { name: 'ghost', defaultValue: 'ignored' },
        ],
      });

      expect(prompt.variables).toEqual([
        { name: 'tone', defaultValue: 'formal', description: 'Register' },
      ]);
    });

    it('files the prompt in a folder with tags', async () => {
      const folderId = await createFolder(me, 'Dev');
      const tagId = await createTag(me, 'claude');

      const prompt = await createPrompt(me, { folderId, tagIds: [tagId] });

      expect(prompt.folderId).toBe(folderId);
      expect(prompt.tags).toEqual([{ id: tagId, name: 'claude', color: '#8b5cf6' }]);
    });

    it("refuses someone else's folder", async () => {
      const folderId = await createFolder(await signUp(http), 'Theirs');

      await as(me).post('/api/prompts').send({ title: 'x', content: 'y', folderId }).expect(404);
    });

    it("refuses someone else's tag", async () => {
      const tagId = await createTag(await signUp(http), 'theirs');

      await as(me)
        .post('/api/prompts')
        .send({ title: 'x', content: 'y', tagIds: [tagId] })
        .expect(404);
    });

    it.each([{ content: 'no title' }, { title: 'no content' }, { title: ' ', content: 'x' }])(
      'rejects %p',
      async (payload) => {
        await as(me).post('/api/prompts').send(payload).expect(400);
      },
    );
  });

  describe('GET /api/prompts/:id', () => {
    it('returns the prompt', async () => {
      const prompt = await createPrompt(me, { title: 'Mine' });

      const res = await as(me).get(`/api/prompts/${prompt.id}`).expect(200);

      expect((res.body as Prompt).title).toBe('Mine');
    });

    it("hides someone else's prompt", async () => {
      const theirs = await createPrompt(await signUp(http));

      await as(me).get(`/api/prompts/${theirs.id}`).expect(404);
    });
  });

  describe('GET /api/prompts', () => {
    it("lists only the current user's prompts", async () => {
      await createPrompt(me, { title: 'Mine' });
      await createPrompt(await signUp(http), { title: 'Theirs' });

      expect(await listTitles('')).toEqual(['Mine']);
    });

    it('filters by folder', async () => {
      const folderId = await createFolder(me, 'Dev');
      await createPrompt(me, { title: 'Filed', folderId });
      await createPrompt(me, { title: 'Loose' });

      expect(await listTitles(`?folderId=${folderId}`)).toEqual(['Filed']);
    });

    it('filters by tag', async () => {
      const tagId = await createTag(me, 'claude');
      await createPrompt(me, { title: 'Tagged', tagIds: [tagId] });
      await createPrompt(me, { title: 'Plain' });

      expect(await listTitles(`?tagId=${tagId}`)).toEqual(['Tagged']);
    });

    it('filters favourites', async () => {
      await createPrompt(me, { title: 'Starred', isFavorite: true });
      await createPrompt(me, { title: 'Ordinary' });

      expect(await listTitles('?favorite=true')).toEqual(['Starred']);
    });

    it('searches title, description, content and tag names, ignoring case', async () => {
      const tagId = await createTag(me, 'Marketing');
      await createPrompt(me, { title: 'By title: Kubernetes' });
      await createPrompt(me, { title: 'By description', description: 'about KUBERNETES' });
      await createPrompt(me, { title: 'By content', content: 'deploy on kubernetes' });
      await createPrompt(me, { title: 'By tag', tagIds: [tagId] });
      await createPrompt(me, { title: 'Unrelated' });

      expect((await listTitles('?q=kubernetes')).sort()).toEqual([
        'By content',
        'By description',
        'By title: Kubernetes',
      ]);
      expect(await listTitles('?q=market')).toEqual(['By tag']);
    });

    it('sorts by title', async () => {
      await createPrompt(me, { title: 'Bravo' });
      await createPrompt(me, { title: 'alpha' });
      await createPrompt(me, { title: 'Charlie' });

      expect(await listTitles('?sort=title')).toEqual(['alpha', 'Bravo', 'Charlie']);
    });

    it('sorts by most used', async () => {
      const rare = await createPrompt(me, { title: 'Rare' });
      const frequent = await createPrompt(me, { title: 'Frequent' });
      await as(me).post(`/api/prompts/${frequent.id}/use`).expect(200);
      await as(me).post(`/api/prompts/${frequent.id}/use`).expect(200);
      await as(me).post(`/api/prompts/${rare.id}/use`).expect(200);

      expect(await listTitles('?sort=used')).toEqual(['Frequent', 'Rare']);
    });

    it('rejects an unknown sort', async () => {
      await as(me).get('/api/prompts?sort=random').expect(400);
    });
  });

  describe('PATCH /api/prompts/:id', () => {
    it('versions a content change and re-syncs variables, keeping known defaults', async () => {
      const prompt = await createPrompt(me, {
        content: 'Hi {{name}} from {{city}}',
        variables: [{ name: 'name', defaultValue: 'Ada' }],
      });

      const res = await as(me)
        .patch(`/api/prompts/${prompt.id}`)
        .send({ content: 'Hello {{name}}, today is {{day}}' })
        .expect(200);

      expect(res.body).toMatchObject({
        version: 2,
        variables: [
          { name: 'name', defaultValue: 'Ada' },
          { name: 'day', defaultValue: null },
        ],
      });
    });

    it('updates variable defaults without creating a version', async () => {
      const prompt = await createPrompt(me, { content: 'Hi {{name}}' });

      const res = await as(me)
        .patch(`/api/prompts/${prompt.id}`)
        .send({ variables: [{ name: 'name', defaultValue: 'Grace' }] })
        .expect(200);

      expect(res.body).toMatchObject({ version: 1, variables: [{ defaultValue: 'Grace' }] });
    });

    it('does not version metadata changes', async () => {
      const prompt = await createPrompt(me);

      const res = await as(me)
        .patch(`/api/prompts/${prompt.id}`)
        .send({ isFavorite: true, description: 'Now described' })
        .expect(200);

      expect(res.body).toMatchObject({
        version: 1,
        isFavorite: true,
        description: 'Now described',
      });
    });

    it('replaces the tags and moves the prompt out of its folder', async () => {
      const first = await createTag(me, 'first');
      const second = await createTag(me, 'second');
      const folderId = await createFolder(me, 'Dev');
      const prompt = await createPrompt(me, { tagIds: [first], folderId });

      const res = await as(me)
        .patch(`/api/prompts/${prompt.id}`)
        .send({ tagIds: [second], folderId: null })
        .expect(200);

      const updated = res.body as Prompt;
      expect(updated.tags.map((t) => t.name)).toEqual(['second']);
      expect(updated.folderId).toBeNull();
    });

    it("hides someone else's prompt", async () => {
      const theirs = await createPrompt(await signUp(http));

      await as(me).patch(`/api/prompts/${theirs.id}`).send({ title: 'Hijacked' }).expect(404);
    });
  });

  describe('versions', () => {
    it('lists versions, newest first', async () => {
      const prompt = await createPrompt(me, { content: 'v1' });
      await as(me).patch(`/api/prompts/${prompt.id}`).send({ content: 'v2' }).expect(200);

      const res = await as(me).get(`/api/prompts/${prompt.id}/versions`).expect(200);

      expect((res.body as Version[]).map((v) => [v.versionNumber, v.content])).toEqual([
        [2, 'v2'],
        [1, 'v1'],
      ]);
    });

    it('restores an old version as a new one', async () => {
      const prompt = await createPrompt(me, { title: 'Original', content: 'v1' });
      await as(me)
        .patch(`/api/prompts/${prompt.id}`)
        .send({ title: 'Changed', content: 'v2' })
        .expect(200);

      const res = await as(me).post(`/api/prompts/${prompt.id}/versions/1/restore`).expect(201);

      expect(res.body).toMatchObject({ title: 'Original', content: 'v1', version: 3 });
    });

    it('answers 404 for an unknown version', async () => {
      const prompt = await createPrompt(me);

      await as(me).post(`/api/prompts/${prompt.id}/versions/9/restore`).expect(404);
    });

    it("hides someone else's history", async () => {
      const theirs = await createPrompt(await signUp(http));

      await as(me).get(`/api/prompts/${theirs.id}/versions`).expect(404);
    });
  });

  describe('POST /api/prompts/:id/use', () => {
    it('counts the use', async () => {
      const prompt = await createPrompt(me);

      const res = await as(me).post(`/api/prompts/${prompt.id}/use`).expect(200);

      const used = res.body as Prompt;
      expect(used.usageCount).toBe(1);
      expect(used.lastUsedAt).toEqual(expect.any(String));
    });

    it("hides someone else's prompt", async () => {
      const theirs = await createPrompt(await signUp(http));

      await as(me).post(`/api/prompts/${theirs.id}/use`).expect(404);
    });
  });

  describe('POST /api/prompts/:id/duplicate', () => {
    it('copies the prompt with its tags and variables, as a fresh one', async () => {
      const tagId = await createTag(me, 'claude');
      const prompt = await createPrompt(me, {
        title: 'Template',
        content: 'Hi {{name}}',
        tagIds: [tagId],
        isFavorite: true,
        variables: [{ name: 'name', defaultValue: 'Ada' }],
      });
      await as(me).post(`/api/prompts/${prompt.id}/use`).expect(200);

      const res = await as(me).post(`/api/prompts/${prompt.id}/duplicate`).expect(201);

      expect(res.body).toMatchObject({
        title: 'Template (copie)',
        content: 'Hi {{name}}',
        isFavorite: false,
        usageCount: 0,
        version: 1,
        tags: [{ id: tagId }],
        variables: [{ name: 'name', defaultValue: 'Ada' }],
      });
    });
  });

  describe('DELETE /api/prompts/:id', () => {
    it('deletes the prompt', async () => {
      const prompt = await createPrompt(me);

      await as(me).delete(`/api/prompts/${prompt.id}`).expect(204);

      await as(me).get(`/api/prompts/${prompt.id}`).expect(404);
    });

    it("hides someone else's prompt", async () => {
      const theirs = await createPrompt(await signUp(http));

      await as(me).delete(`/api/prompts/${theirs.id}`).expect(404);
    });

    it('answers 404 for an unknown prompt', async () => {
      await as(me).delete(`/api/prompts/${randomUUID()}`).expect(404);
    });
  });

  describe('interplay with folders and tags', () => {
    it('lifts the prompts of a deleted folder to its parent', async () => {
      const parent = await createFolder(me, 'Parent');
      const childRes = await as(me)
        .post('/api/folders')
        .send({ name: 'Child', parentId: parent })
        .expect(201);
      const child = (childRes.body as { id: string }).id;
      const prompt = await createPrompt(me, { folderId: child });

      await as(me).delete(`/api/folders/${child}`).expect(204);

      const res = await as(me).get(`/api/prompts/${prompt.id}`).expect(200);
      expect((res.body as Prompt).folderId).toBe(parent);
    });

    it('counts prompts per tag and per folder', async () => {
      const tagId = await createTag(me, 'counted');
      const folderId = await createFolder(me, 'Counted');
      await createPrompt(me, { tagIds: [tagId], folderId });
      await createPrompt(me, { tagIds: [tagId] });

      const tags = await as(me).get('/api/tags').expect(200);
      const folders = await as(me).get('/api/folders').expect(200);

      expect(tags.body).toMatchObject([{ promptCount: 2 }]);
      expect(folders.body).toMatchObject([{ promptCount: 1 }]);
    });
  });
});
