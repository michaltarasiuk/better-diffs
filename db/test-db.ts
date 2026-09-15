import {createClient} from '@libsql/client';
import {pushSQLiteSchema} from 'drizzle-kit/api';
import {drizzle} from 'drizzle-orm/libsql';

import * as schema from './schema';

export const ACTOR_ID = 'actor-id';

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function createTestDb() {
  const client = createClient({url: ':memory:'});
  const db = drizzle(client, {schema});

  const {apply} = await pushSQLiteSchema(schema, db);
  await apply();

  return db;
}

export async function seedActor(db: TestDb, id = ACTOR_ID) {
  await db
    .insert(schema.user)
    .values({id, name: 'User', email: `${id}@example.com`});

  return id;
}

export async function seedShare(db: TestDb, id: string) {
  await db.insert(schema.shares).values({id});

  return id;
}
