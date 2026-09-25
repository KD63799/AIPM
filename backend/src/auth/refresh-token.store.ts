import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import type { Env } from '../config/env';

// Compare-and-swap in one round trip: two concurrent rotations cannot both win.
// Returns 1 when rotated, 0 for an unknown session, -1 on replay (session deleted).
const ROTATE_SCRIPT = `
local stored = redis.call('HGET', KEYS[1], 'secretHash')
if not stored then return 0 end
if stored ~= ARGV[1] then
  redis.call('DEL', KEYS[1])
  return -1
end
redis.call('HSET', KEYS[1], 'secretHash', ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1`;

const sessionKey = (sessionId: string): string => `refresh:session:${sessionId}`;
const userKey = (userId: string): string => `refresh:user:${userId}`;
const hash = (secret: string): string => createHash('sha256').update(secret).digest('hex');

/**
 * Opaque refresh tokens `<sessionId>.<secret>`, rotated on every use.
 * Presenting an already-rotated secret means the token leaked: the whole session is revoked.
 */
@Injectable()
export class RefreshTokenStore {
  private readonly ttl: number;

  constructor(
    private readonly redis: Redis,
    config: ConfigService<Pick<Env, 'JWT_REFRESH_TTL'>, true>,
  ) {
    this.ttl = config.get('JWT_REFRESH_TTL', { infer: true });
  }

  async issue(userId: string): Promise<string> {
    const sessionId = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    await this.redis
      .multi()
      .hset(sessionKey(sessionId), { userId, secretHash: hash(secret) })
      .expire(sessionKey(sessionId), this.ttl)
      .sadd(userKey(userId), sessionId)
      .expire(userKey(userId), this.ttl)
      .exec();
    return `${sessionId}.${secret}`;
  }

  /** The session owner and its next token, or null when the token must be refused. */
  async rotate(token: string): Promise<{ userId: string; token: string } | null> {
    const [sessionId, secret] = token.split('.');
    if (!sessionId || !secret) return null;

    const userId = await this.redis.hget(sessionKey(sessionId), 'userId');
    if (!userId) return null;

    const next = randomBytes(32).toString('base64url');
    const outcome = await this.redis.eval(
      ROTATE_SCRIPT,
      1,
      sessionKey(sessionId),
      hash(secret),
      hash(next),
      this.ttl,
    );
    return outcome === 1 ? { userId, token: `${sessionId}.${next}` } : null;
  }

  async revoke(token: string): Promise<void> {
    const [sessionId] = token.split('.');
    if (sessionId) await this.redis.del(sessionKey(sessionId));
  }

  async revokeAll(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(userKey(userId));
    await this.redis.del(userKey(userId), ...sessionIds.map(sessionKey));
  }
}
