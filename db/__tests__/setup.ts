import 'server-only';

import {
  generateSQLiteDrizzleJson,
  generateSQLiteMigration,
} from 'drizzle-kit/api';
import {eq, getTableName, is, sql} from 'drizzle-orm';
import {SQLiteTable} from 'drizzle-orm/sqlite-core';
import {beforeAll, beforeEach} from 'vitest';

import {db} from '@/db/db';
import * as schema from '@/db/schema';
import {isDefined} from '@/utils/is-defined';
import {newId} from '@/utils/new-id';

const TABLE_NAMES = Object.values(schema)
  .filter((value) => is(value, SQLiteTable))
  .map((table) => getTableName(table));

async function createSchema() {
  const [existing] = await db.all(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'shares'`,
  );
  if (isDefined(existing)) {
    return;
  }

  const statements = await generateSQLiteMigration(
    await generateSQLiteDrizzleJson({}),
    await generateSQLiteDrizzleJson(schema),
  );
  for (const statement of statements) {
    await db.run(sql.raw(statement));
  }
}

async function clearTables() {
  await db.run(sql`PRAGMA foreign_keys = OFF`);
  for (const name of TABLE_NAMES) {
    await db.run(sql`DELETE FROM ${sql.identifier(name)}`);
  }
  await db.run(sql`PRAGMA foreign_keys = ON`);
}

export function setupTestDb() {
  beforeAll(createSchema);
  beforeEach(clearTables);
}

export async function insertUser(
  values: Partial<typeof schema.user.$inferInsert> = {},
) {
  const id = values.id ?? newId();
  const [user] = await db
    .insert(schema.user)
    .values({id, name: id, email: `${id}@example.com`, ...values})
    .returning();
  return user!;
}

export async function ageShare(shareId: string, hours: number) {
  await db
    .update(schema.shares)
    .set({lastVisitedAt: sql`datetime('now', ${`-${hours} hours`})`})
    .where(eq(schema.shares.id, shareId));
}
