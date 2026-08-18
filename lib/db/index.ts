import 'server-only';

import Database from 'better-sqlite3';
import {drizzle} from 'drizzle-orm/better-sqlite3';

import {env} from '@/lib/env';

import * as schema from './schema';

declare global {
  var __sqlite: Database.Database | undefined;
}

function createSqlite() {
  const sqlite = new Database(env.DATABASE_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return sqlite;
}

const sqlite = globalThis.__sqlite ?? createSqlite();

if (env.NODE_ENV !== 'production') {
  globalThis.__sqlite = sqlite;
}

export const db = drizzle(sqlite, {schema});
