import { execSync } from 'node:child_process';
import { Client } from 'pg';
import './env';

/** Creates the test database on first run, migrates it and wipes previous runs. */
export default async function globalSetup(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL ?? '');
  const admin = new URL(url);
  admin.pathname = '/postgres';
  admin.search = '';

  const adminClient = new Client({ connectionString: admin.toString() });
  await adminClient.connect();
  const name = url.pathname.slice(1);
  const existing = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (existing.rowCount === 0) await adminClient.query(`CREATE DATABASE "${name}"`);
  await adminClient.end();

  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  await client.query('TRUNCATE "User" CASCADE');
  await client.end();
}
