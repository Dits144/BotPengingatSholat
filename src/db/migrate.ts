import { db } from '../config/database';

async function run() {
  const hasProducts = await db.schema.hasTable('products');
  if (!hasProducts) {
    await db.schema.createTable('products', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable().unique();
      t.integer('default_duration_months').notNullable().defaultTo(0);
      t.integer('default_duration_days').notNullable().defaultTo(30);
      t.decimal('price', 15, 2).nullable();
      t.text('note').nullable();
      t.timestamp('created_at').notNullable();
      t.timestamp('updated_at').notNullable();
    });
  }

  const hasStock = await db.schema.hasTable('stock_accounts');
  if (!hasStock) {
    await db.schema.createTable('stock_accounts', (t) => {
      t.increments('id').primary();
      t.integer('product_id').notNullable().references('id').inTable('products');
      t.text('email_encrypted').notNullable();
      t.text('password_encrypted').notNullable();
      t.timestamp('added_at').notNullable();
      t.timestamp('start_at').nullable();
      t.timestamp('expires_at').nullable();
      t.string('status', 20).notNullable().index();
      t.string('sold_to').nullable();
      t.timestamp('sold_at').nullable();
      t.text('note').nullable();
      t.boolean('activate_on_sale').notNullable().defaultTo(false);
      t.integer('duration_months').notNullable().defaultTo(0);
      t.integer('duration_days').notNullable().defaultTo(0);
    });
  }

  const hasLog = await db.schema.hasTable('activity_logs');
  if (!hasLog) {
    await db.schema.createTable('activity_logs', (t) => {
      t.increments('id').primary();
      t.string('action', 32).notNullable();
      t.string('actor').notNullable();
      t.text('payload').nullable();
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
