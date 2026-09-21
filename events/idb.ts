import 'client-only';

import {type DBSchema, type IDBPDatabase, openDB} from 'idb';

import {isDefined} from '@/utils/is-defined';
import type {ShareEvent} from './schemas';

const DB_NAME = 'better-diffs';
const DB_VERSION = 1;
const STORE_NAME = 'events';

interface EventDbSchema extends DBSchema {
  events: {
    key: string;
    value: ShareEvent;
    indexes: {'by-share-seq': [shareId: string, seq: number]};
  };
}

let dbPromise: Promise<IDBPDatabase<EventDbSchema>> | null = null;

async function openEventDb() {
  dbPromise ??= openDB<EventDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, {keyPath: 'id'});
      store.createIndex('by-share-seq', ['shareId', 'seq']);
    },
  });
  return dbPromise;
}

export async function getEvents(shareId: string) {
  const db = await openEventDb();
  const range = IDBKeyRange.bound(
    [shareId, 0],
    [shareId, Number.MAX_SAFE_INTEGER],
  );
  const events = await db.getAllFromIndex(STORE_NAME, 'by-share-seq', range);
  return events;
}

export async function getLastSeq(shareId: string) {
  const db = await openEventDb();
  const range = IDBKeyRange.bound(
    [shareId, 0],
    [shareId, Number.MAX_SAFE_INTEGER],
  );

  const tx = db.transaction(STORE_NAME, 'readonly');
  const cursor = await tx.store.index('by-share-seq').openCursor(range, 'prev');
  const lastSeq = isDefined(cursor) ? cursor.value.seq : null;
  await tx.done;

  return lastSeq;
}

export async function putEvents(events: readonly ShareEvent[]) {
  const db = await openEventDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([...events.map((event) => tx.store.put(event)), tx.done]);
}

export async function clearEvents() {
  const db = await openEventDb();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all([tx.store.clear(), tx.done]);
}

export async function closeEventDb() {
  if (!isDefined(dbPromise)) {
    return;
  }
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}
