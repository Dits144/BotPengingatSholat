import fs from 'node:fs';
import path from 'node:path';
import knex from 'knex';
import { env } from './env';

const isSqlite = env.databaseClient === 'sqlite';

if (isSqlite) {
  const dir = path.dirname(env.databaseUrl);
  if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
}

export const db = knex({
  client: isSqlite ? 'better-sqlite3' : 'pg',
  connection: isSqlite
    ? { filename: env.databaseUrl }
    : env.databaseUrl,
  useNullAsDefault: true,
  pool: isSqlite
    ? {
        min: 1,
        max: 1,
        afterCreate: (conn: { pragma: (sql: string) => unknown }, done: (err: Error | null, conn: unknown) => void) => {
          try {
            conn.pragma('journal_mode = WAL');
            conn.pragma('busy_timeout = 5000');
            done(null, conn);
          } catch (error) {
            done(error as Error, conn);
          }
        }
      }
    : { min: 1, max: 5 }
});
