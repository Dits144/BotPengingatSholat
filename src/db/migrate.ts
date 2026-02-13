import { db } from '../config/database';

async function run() {
  const hasProducts = await db.schema.hasTable('products');
  if (!hasProducts) {
    await db.schema.createTable('products', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable().unique();
      t.text('description').nullable();
      t.timestamp('created_at').notNullable();
    });
  }

  const hasAccounts = await db.schema.hasTable('accounts');
  if (!hasAccounts) {
    await db.schema.createTable('accounts', (t) => {
      t.increments('id').primary();
      t.integer('product_id').notNullable().references('id').inTable('products');
      t.text('email_encrypted').notNullable();
      t.text('password_encrypted').notNullable();
      t.timestamp('expires_at').notNullable().index();
      t.boolean('allow_buy').notNullable().defaultTo(true);
      t.boolean('allow_rent').notNullable().defaultTo(true);
      t.string('status', 20).notNullable().index();
      t.timestamp('created_at').notNullable();
    });
  }

  const hasRentals = await db.schema.hasTable('rentals');
  if (!hasRentals) {
    await db.schema.createTable('rentals', (t) => {
      t.increments('id').primary();
      t.integer('account_id').notNullable().references('id').inTable('accounts');
      t.bigInteger('user_id').notNullable().index();
      t.timestamp('start_at').notNullable();
      t.timestamp('end_at').notNullable().index();
      t.string('status', 20).notNullable().index();
      t.boolean('notified_24h').notNullable().defaultTo(false);
      t.boolean('notified_1h').notNullable().defaultTo(false);
    });
  }

  const hasSales = await db.schema.hasTable('sales');
  if (!hasSales) {
    await db.schema.createTable('sales', (t) => {
      t.increments('id').primary();
      t.integer('account_id').notNullable().references('id').inTable('accounts');
      t.bigInteger('user_id').notNullable().index();
      t.timestamp('sold_at').notNullable();
    });
  }

  const hasUsers = await db.schema.hasTable('users');
  if (!hasUsers) {
    await db.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.bigInteger('telegram_id').notNullable().unique();
      t.string('username').nullable();
      t.string('role', 10).notNullable();
      t.timestamp('logged_in_at').notNullable();
    });
  }

  const hasLogs = await db.schema.hasTable('activity_logs');
  if (!hasLogs) {
    await db.schema.createTable('activity_logs', (t) => {
      t.increments('id').primary();
      t.string('action', 32).notNullable();
      t.string('actor').notNullable();
      t.text('payload_json').nullable();
      t.timestamp('created_at').notNullable();
    });
  }

  console.log('Migration selesai');
  await db.destroy();
}

run().catch(async (e) => {
  console.error(e);
  await db.destroy();
  process.exit(1);
});
