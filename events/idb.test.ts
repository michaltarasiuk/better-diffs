import type {SerializedEditorState} from 'lexical';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {ShareEvent} from './schemas';

const DB_NAME = 'better-diffs';
const SHARE_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_SHARE_ID = '00000000-0000-4000-8000-0000000000ff';
const THREAD_ID = '00000000-0000-4000-8000-000000000002';

const BODY = {text: 'value'} as unknown as SerializedEditorState;

function event(seq: number, shareId = SHARE_ID): ShareEvent {
  return {
    id: `event-${shareId}-${seq}`,
    shareId,
    seq,
    type: 'thread.resolved',
    subjectId: THREAD_ID,
    actorId: 'actor-id',
    payload: {$type: 'thread.resolved', threadId: THREAD_ID},
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

const DELETE_TIMEOUT_MS = 10_000;

function deleteEventDb() {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Delete timed out: ${DB_NAME}`));
    }, DELETE_TIMEOUT_MS);

    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => {
      clearTimeout(timeout);
      reject(request.error ?? new Error(`Delete failed: ${DB_NAME}`));
    };
    /*
     * Delete stays pending until open connections close; rejecting here
     * races cleanup in CI where close and delete can overlap briefly.
     */
    request.onblocked = () => {};
    request.onsuccess = () => {
      clearTimeout(timeout);
      resolve();
    };
  });
}

/*
 * idb.ts memoises its database handle at module scope, so each test needs a
 * fresh module alongside a fresh IndexedDB to start from an empty store.
 */
let idb: typeof import('./idb') | null = null;

async function closeImportedEventDb() {
  if (!idb) {
    return;
  }
  await idb.closeEventDb();
  idb = null;
}

async function resetEventDb() {
  await closeImportedEventDb();
  vi.resetModules();
  await deleteEventDb();
}

async function importIdb() {
  await closeImportedEventDb();
  vi.resetModules();
  const module = await import('./idb');
  idb = module;
  return module;
}

beforeEach(resetEventDb);

afterEach(resetEventDb);

describe('putEvents', {concurrent: false}, () => {
  it('stores events so they can be read back', async () => {
    const {getEvents, putEvents} = await importIdb();

    await putEvents([event(1), event(2)]);

    expect((await getEvents(SHARE_ID)).map((it) => it.seq)).toEqual([1, 2]);
  });

  it('accepts an empty batch', async () => {
    const {getEvents, putEvents} = await importIdb();

    await expect(putEvents([])).resolves.toBeUndefined();
    await expect(getEvents(SHARE_ID)).resolves.toEqual([]);
  });

  it('replaces an event that is stored twice', async () => {
    const {getEvents, putEvents} = await importIdb();

    await putEvents([event(1)]);
    await putEvents([event(1)]);

    await expect(getEvents(SHARE_ID)).resolves.toHaveLength(1);
  });

  it('keeps events written by separate calls', async () => {
    const {getEvents, putEvents} = await importIdb();

    await putEvents([event(1)]);
    await putEvents([event(2)]);

    expect((await getEvents(SHARE_ID)).map((it) => it.seq)).toEqual([1, 2]);
  });
});

describe('getEvents', {concurrent: false}, () => {
  it('returns an empty log for a share it has never seen', async () => {
    const {getEvents} = await importIdb();

    await expect(getEvents(SHARE_ID)).resolves.toEqual([]);
  });

  it('orders the log by sequence regardless of write order', async () => {
    const {getEvents, putEvents} = await importIdb();

    await putEvents([event(3), event(1), event(2)]);

    expect((await getEvents(SHARE_ID)).map((it) => it.seq)).toEqual([1, 2, 3]);
  });

  it('only returns the events of the share it was asked for', async () => {
    const {getEvents, putEvents} = await importIdb();

    await putEvents([event(1), event(1, OTHER_SHARE_ID)]);

    const events = await getEvents(SHARE_ID);

    expect(events).toHaveLength(1);
    expect(events[0]?.shareId).toBe(SHARE_ID);
  });

  it('round-trips the whole event', async () => {
    const {getEvents, putEvents} = await importIdb();
    const stored = {...event(1), payload: {...event(1).payload}} as ShareEvent;

    await putEvents([stored]);

    expect((await getEvents(SHARE_ID))[0]).toEqual(stored);
  });

  it('keeps a body that is not plain JSON intact', async () => {
    const {getEvents, putEvents} = await importIdb();
    const stored: ShareEvent = {
      ...event(1),
      type: 'comment.edited',
      payload: {$type: 'comment.edited', commentId: THREAD_ID, body: BODY},
    };

    await putEvents([stored]);

    expect((await getEvents(SHARE_ID))[0]?.payload).toEqual(stored.payload);
  });
});

describe('getLastSeq', {concurrent: false}, () => {
  it('returns null while the share has no events', async () => {
    const {getLastSeq} = await importIdb();

    await expect(getLastSeq(SHARE_ID)).resolves.toBe(null);
  });

  it('returns the highest sequence stored for the share', async () => {
    const {getLastSeq, putEvents} = await importIdb();

    await putEvents([event(1), event(3), event(2)]);

    await expect(getLastSeq(SHARE_ID)).resolves.toBe(3);
  });

  it('ignores the sequences of other shares', async () => {
    const {getLastSeq, putEvents} = await importIdb();

    await putEvents([event(1), event(9, OTHER_SHARE_ID)]);

    await expect(getLastSeq(SHARE_ID)).resolves.toBe(1);
  });

  it('returns null when only other shares have events', async () => {
    const {getLastSeq, putEvents} = await importIdb();

    await putEvents([event(9, OTHER_SHARE_ID)]);

    await expect(getLastSeq(SHARE_ID)).resolves.toBe(null);
  });
});
