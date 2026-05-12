import fs from 'node:fs';
import path from 'node:path';
import { db } from '../config/database';

async function run() {
  const sqlPath = path.join(__dirname, 'migrations/001_init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await db.raw(statement);
  }

  console.log('Migration selesai');
  await db.destroy();
}

run().catch(async (e) => {
  console.error(e);
  await db.destroy();
  process.exit(1);
});
