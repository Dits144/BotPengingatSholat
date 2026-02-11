import fs from 'node:fs';
import path from 'node:path';
import knex from 'knex';
import { env } from './env';

if (env.databaseClient === 'sqlite') {
  const dir = path.dirname(env.databaseUrl);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
}

export const db = knex({
  client: env.databaseClient === 'postgres' ? 'pg' : 'better-sqlite3',
  connection:
    env.databaseClient === 'postgres'
      ? env.databaseUrl
      : {
          filename: env.databaseUrl
        },
  useNullAsDefault: true,
  pool: { min: 1, max: 5 }
});
