import type {SerializedEditorState} from 'lexical';
import {afterAll, beforeEach, describe, expect, it} from 'vitest';

import {
  clearEvents,
  closeEventDb,
  getEvents,
  getLastSeq,
  putEvents,
} from './idb';
import type {ShareEvent} from './schemas';

const SHARE_ID_1 = '00000000-0000-4000-8000-000000000001';
const SHARE_ID_2 = '00000000-0000-4000-8000-0000000000ff';
const THREAD_ID = '00000000-0000-4000-8000-000000000002';

const BODY = {text: 'value'} as unknown as SerializedEditorState;

function event(seq: number, shareId = SHARE_ID_1): ShareEvent {
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

beforeEach(() => clearEvents());

afterAll(() => closeEventDb());

describe('putEvents', () => {
  it('stores events so they can be read back', async () => {
    await putEvents([event(1), event(2)]);

    expect((await getEvents(SHARE_ID_1)).map((it) => it.seq)).toEqual([1, 2]);
  });

  it('accepts an empty batch', async () => {
    await expect(putEvents([])).resolves.toBeUndefined();
  });

  it('leaves the store empty after an empty batch', async () => {
    await putEvents([]);

    await expect(getEvents(SHARE_ID_1)).resolves.toEqual([]);
  });

  it('replaces an event that is stored twice', async () => {
    await putEvents([event(1)]);
    await putEvents([event(1)]);

    await expect(getEvents(SHARE_ID_1)).resolves.toHaveLength(1);
  });

  it('keeps events written by separate calls', async () => {
    await putEvents([event(1)]);
    await putEvents([event(2)]);

    expect((await getEvents(SHARE_ID_1)).map((it) => it.seq)).toEqual([1, 2]);
  });
});

describe('getEvents', () => {
  it('returns an empty log for a share it has never seen', async () => {
    await expect(getEvents(SHARE_ID_1)).resolves.toEqual([]);
  });

  it('orders the log by sequence regardless of write order', async () => {
    await putEvents([event(3), event(1), event(2)]);

    expect((await getEvents(SHARE_ID_1)).map((it) => it.seq)).toEqual([
      1, 2, 3,
    ]);
  });

  it('returns only one event for the requested share', async () => {
    await putEvents([event(1), event(1, SHARE_ID_2)]);

    expect(await getEvents(SHARE_ID_1)).toHaveLength(1);
  });

  it('scopes results to the requested share', async () => {
    await putEvents([event(1), event(1, SHARE_ID_2)]);

    expect((await getEvents(SHARE_ID_1))[0]?.shareId).toBe(SHARE_ID_1);
  });

  it('round-trips the whole event', async () => {
    const stored = {...event(1), payload: {...event(1).payload}} as ShareEvent;

    await putEvents([stored]);

    expect((await getEvents(SHARE_ID_1))[0]).toEqual(stored);
  });

  it('keeps a body that is not plain JSON intact', async () => {
    const stored: ShareEvent = {
      ...event(1),
      type: 'comment.edited',
      payload: {$type: 'comment.edited', commentId: THREAD_ID, body: BODY},
    };

    await putEvents([stored]);

    expect((await getEvents(SHARE_ID_1))[0]?.payload).toEqual(stored.payload);
  });
});

describe('getLastSeq', () => {
  it('returns null while the share has no events', async () => {
    await expect(getLastSeq(SHARE_ID_1)).resolves.toBe(null);
  });

  it('returns the highest sequence stored for the share', async () => {
    await putEvents([event(1), event(3), event(2)]);

    await expect(getLastSeq(SHARE_ID_1)).resolves.toBe(3);
  });

  it('ignores the sequences of other shares', async () => {
    await putEvents([event(1), event(9, SHARE_ID_2)]);

    await expect(getLastSeq(SHARE_ID_1)).resolves.toBe(1);
  });

  it('returns null when only other shares have events', async () => {
    await putEvents([event(9, SHARE_ID_2)]);

    await expect(getLastSeq(SHARE_ID_1)).resolves.toBe(null);
  });
});
