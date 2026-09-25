import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { RefreshTokenStore } from './refresh-token.store';

// Runs against a real Redis (`task infra`), db 1 so dev sessions are untouched.
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/1');
const store = new RefreshTokenStore(redis, new ConfigService({ JWT_REFRESH_TTL: 60 }));

afterAll(() => redis.quit());

describe('RefreshTokenStore', () => {
  let userId: string;

  beforeEach(() => {
    userId = randomUUID();
  });

  it('rotates a token into a new one owned by the same user', async () => {
    const token = await store.issue(userId);

    const rotated = await store.rotate(token);

    expect(rotated?.userId).toBe(userId);
    expect(rotated?.token).not.toBe(token);
  });

  it('keeps rotating along the chain', async () => {
    const first = await store.rotate(await store.issue(userId));
    const second = await store.rotate(first?.token ?? '');

    expect(second?.userId).toBe(userId);
  });

  it('rejects a token that was already rotated', async () => {
    const token = await store.issue(userId);
    await store.rotate(token);

    expect(await store.rotate(token)).toBeNull();
  });

  it('revokes the whole session when a rotated token is replayed', async () => {
    const stolen = await store.issue(userId);
    const legit = await store.rotate(stolen);

    await store.rotate(stolen);

    expect(await store.rotate(legit?.token ?? '')).toBeNull();
  });

  it('rejects a token after logout', async () => {
    const token = await store.issue(userId);

    await store.revoke(token);

    expect(await store.rotate(token)).toBeNull();
  });

  it('revokes every session of a user, and only theirs', async () => {
    const laptop = await store.issue(userId);
    const phone = await store.issue(userId);
    const someoneElse = await store.issue(randomUUID());

    await store.revokeAll(userId);

    expect(await store.rotate(laptop)).toBeNull();
    expect(await store.rotate(phone)).toBeNull();
    expect(await store.rotate(someoneElse)).not.toBeNull();
  });

  it.each(['', 'garbage', `${randomUUID()}.unknown-secret`])('rejects %p', async (token) => {
    expect(await store.rotate(token)).toBeNull();
  });
});
