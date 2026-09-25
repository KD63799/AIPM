import 'dotenv/config';

// e2e tests run against `<database>_test` and Redis db 1, never against dev data.
const database = new URL(
  process.env.DATABASE_URL ?? 'postgresql://prompt:prompt@localhost:5433/prompt_manager',
);
if (!database.pathname.endsWith('_test')) database.pathname += '_test';
const redis = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
redis.pathname = '/1';

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: database.toString(),
  REDIS_URL: redis.toString(),
  JWT_SECRET: 'e2e-only-secret-at-least-32-characters-long',
  COOKIE_DOMAIN: 'localhost',
  CORS_ORIGIN: 'http://localhost:4200',
});
