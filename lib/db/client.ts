import 'server-only';

import {createClient, type Client} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';

import {env} from '@/lib/env';

import * as schema from './schema';

declare global {
  var __libsql: Client | undefined;
}

function createLibsql() {
  return createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });
}

const client = globalThis.__libsql ?? createLibsql();

if (env.NODE_ENV !== 'production') {
  globalThis.__libsql = client;
}

export const db = drizzle(client, {schema});
