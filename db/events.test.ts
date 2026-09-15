import type {SerializedEditorState} from 'lexical';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {ShareEventPayload} from '@/events/schemas';
import type {TestDb} from './test-db';
import {ACTOR_ID, createTestDb, seedActor, seedShare} from './test-db';

/*
 * db/events.ts binds the shared connection at import time, so the mock has
 * to hand back whichever in-memory database the running test just built.
 */
const dbRef = vi.hoisted(() => ({current: null as unknown}));

vi.mock('@/db/db', () => ({
  get db() {
    return dbRef.current;
  },
}));

const {appendEvents, getEvents} = await import('./events');

const SHARE_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_SHARE_ID = '00000000-0000-4000-8000-0000000000ff';
const THREAD_ID = '00000000-0000-4000-8000-000000000002';
const COMMENT_ID = '00000000-0000-4000-8000-000000000003';

const BODY = {text: 'value'} as unknown as SerializedEditorState;

const OPENED = {
  $type: 'thread.opened',
  threadId: THREAD_ID,
  anchor: {
    shareId: SHARE_ID,
    filePath: 'src/a.ts',
    side: 'additions',
    line: 4,
  },
} as const satisfies ShareEventPayload;

const CREATED = {
  $type: 'comment.created',
  threadId: THREAD_ID,
  commentId: COMMENT_ID,
  body: BODY,
} as const satisfies ShareEventPayload;

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
  dbRef.current = db;
  await seedActor(db);
  await seedShare(db, SHARE_ID);
  await seedShare(db, OTHER_SHARE_ID);
});

describe('appendEvents', () => {
  it('numbers the first batch from one', async () => {
    const inserted = await appendEvents(SHARE_ID, ACTOR_ID, [OPENED, CREATED]);

    expect(inserted.map((event) => event.seq)).toEqual([1, 2]);
  });

  it('continues numbering where the previous batch stopped', async () => {
    await appendEvents(SHARE_ID, ACTOR_ID, [OPENED, CREATED]);

    const inserted = await appendEvents(SHARE_ID, ACTOR_ID, [
      {$type: 'thread.resolved', threadId: THREAD_ID},
    ]);

    expect(inserted.map((event) => event.seq)).toEqual([3]);
  });

  it('numbers each share independently', async () => {
    await appendEvents(SHARE_ID, ACTOR_ID, [OPENED, CREATED]);

    const inserted = await appendEvents(OTHER_SHARE_ID, ACTOR_ID, [
      {...OPENED, anchor: {...OPENED.anchor, shareId: OTHER_SHARE_ID}},
    ]);

    expect(inserted.map((event) => event.seq)).toEqual([1]);
  });

  it('persists the actor, type, and payload unchanged', async () => {
    const [event] = await appendEvents(SHARE_ID, ACTOR_ID, [OPENED]);

    expect(event).toMatchObject({
      shareId: SHARE_ID,
      actorId: ACTOR_ID,
      type: 'thread.opened',
      payload: OPENED,
    });
  });

  it('stamps one createdAt across the whole batch', async () => {
    const inserted = await appendEvents(SHARE_ID, ACTOR_ID, [OPENED, CREATED]);

    const timestamps = new Set(inserted.map((event) => event.createdAt));

    expect(timestamps.size).toBe(1);
  });

  it.each([
    {
      name: 'thread.opened',
      payload: OPENED,
      subjectId: THREAD_ID,
    },
    {
      name: 'thread.resolved',
      payload: {$type: 'thread.resolved', threadId: THREAD_ID},
      subjectId: THREAD_ID,
    },
    {
      name: 'comment.created',
      payload: CREATED,
      subjectId: COMMENT_ID,
    },
    {
      name: 'comment.edited',
      payload: {$type: 'comment.edited', commentId: COMMENT_ID, body: BODY},
      subjectId: COMMENT_ID,
    },
    {
      name: 'comment.deleted',
      payload: {$type: 'comment.deleted', commentId: COMMENT_ID},
      subjectId: COMMENT_ID,
    },
  ] satisfies {
    name: string;
    payload: ShareEventPayload;
    subjectId: string;
  }[])('derives the subject of $name from its own id', async (testCase) => {
    const [event] = await appendEvents(SHARE_ID, ACTOR_ID, [testCase.payload]);

    expect(event?.subjectId).toBe(testCase.subjectId);
  });

  it('refuses to append to a share that does not exist', async () => {
    await expect(
      appendEvents('00000000-0000-4000-8000-00000000dead', ACTOR_ID, [OPENED]),
    ).rejects.toThrow(/Share not found/);
  });

  it('leaves the log untouched when the share is missing', async () => {
    await appendEvents(SHARE_ID, ACTOR_ID, [OPENED]);

    await expect(
      appendEvents('00000000-0000-4000-8000-00000000dead', ACTOR_ID, [CREATED]),
    ).rejects.toThrow(/Share not found/);

    await expect(getEvents(SHARE_ID)).resolves.toHaveLength(1);
  });
});

describe('getEvents', () => {
  beforeEach(async () => {
    await appendEvents(SHARE_ID, ACTOR_ID, [
      OPENED,
      CREATED,
      {$type: 'thread.resolved', threadId: THREAD_ID},
    ]);
    await appendEvents(OTHER_SHARE_ID, ACTOR_ID, [
      {...OPENED, anchor: {...OPENED.anchor, shareId: OTHER_SHARE_ID}},
    ]);
  });

  it('returns the whole log in sequence order', async () => {
    const events = await getEvents(SHARE_ID);

    expect(events.map((event) => event.seq)).toEqual([1, 2, 3]);
  });

  it('only returns the events of the share it was asked for', async () => {
    const events = await getEvents(SHARE_ID);

    expect(events.every((event) => event.shareId === SHARE_ID)).toBe(true);
  });

  it('returns everything when no cursor is given', async () => {
    await expect(getEvents(SHARE_ID)).resolves.toHaveLength(3);
    await expect(getEvents(SHARE_ID, 0)).resolves.toHaveLength(3);
  });

  it('skips past the cursor when one is given', async () => {
    const events = await getEvents(SHARE_ID, 2);

    expect(events.map((event) => event.seq)).toEqual([3]);
  });

  it('returns nothing once the cursor passes the log', async () => {
    await expect(getEvents(SHARE_ID, 3)).resolves.toEqual([]);
  });

  it('returns nothing for an unknown share', async () => {
    await expect(
      getEvents('00000000-0000-4000-8000-00000000dead'),
    ).resolves.toEqual([]);
  });

  it('round-trips the payload as JSON', async () => {
    const [event] = await getEvents(SHARE_ID);

    expect(event?.payload).toEqual(OPENED);
  });
});
