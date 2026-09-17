import type {SerializedEditorState} from 'lexical';
import {afterAll, beforeEach, describe, expect, it} from 'vitest';

import {FIXTURE} from '@/fixtures/fixture';
import {
  clearEvents,
  closeEventDb,
  getEvents,
  getLastSeq,
  putEvents,
} from './idb';
import type {ShareEvent} from './schemas';

const BODY = {text: 'value'} as unknown as SerializedEditorState;

function event(seq: number, shareId: string = FIXTURE.share.id) {
  return {
    id: `event-${shareId}-${seq}`,
    shareId,
    seq,
    type: 'thread.resolved',
    subjectId: FIXTURE.thread.id,
    actorId: FIXTURE.actor.id,
    payload: {$type: 'thread.resolved', threadId: FIXTURE.thread.id},
    createdAt: FIXTURE.time.created,
  } satisfies ShareEvent;
}

beforeEach(() => clearEvents());

afterAll(() => closeEventDb());

describe('putEvents', () => {
  it('stores events so they can be read back', async () => {
    await putEvents([event(1), event(2)]);

    expect((await getEvents(FIXTURE.share.id)).map((it) => it.seq)).toEqual([
      1, 2,
    ]);
  });

  it('accepts an empty batch', async () => {
    await expect(putEvents([])).resolves.toBeUndefined();
  });

  it('leaves the store empty after an empty batch', async () => {
    await putEvents([]);

    await expect(getEvents(FIXTURE.share.id)).resolves.toEqual([]);
  });

  it('replaces an event that is stored twice', async () => {
    await putEvents([event(1)]);
    await putEvents([event(1)]);

    await expect(getEvents(FIXTURE.share.id)).resolves.toHaveLength(1);
  });

  it('keeps events written by separate calls', async () => {
    await putEvents([event(1)]);
    await putEvents([event(2)]);

    expect((await getEvents(FIXTURE.share.id)).map((it) => it.seq)).toEqual([
      1, 2,
    ]);
  });
});

describe('getEvents', () => {
  it('returns an empty log for a share it has never seen', async () => {
    await expect(getEvents(FIXTURE.share.id)).resolves.toEqual([]);
  });

  it('orders the log by sequence regardless of write order', async () => {
    await putEvents([event(3), event(1), event(2)]);

    expect((await getEvents(FIXTURE.share.id)).map((it) => it.seq)).toEqual([
      1, 2, 3,
    ]);
  });

  it('returns only one event for the requested share', async () => {
    await putEvents([event(1), event(1, FIXTURE.share.alt)]);

    expect(await getEvents(FIXTURE.share.id)).toHaveLength(1);
  });

  it('scopes results to the requested share', async () => {
    await putEvents([event(1), event(1, FIXTURE.share.alt)]);

    expect((await getEvents(FIXTURE.share.id))[0]?.shareId).toBe(
      FIXTURE.share.id,
    );
  });

  it('round-trips the whole event', async () => {
    const stored = {...event(1), payload: {...event(1).payload}} as ShareEvent;

    await putEvents([stored]);

    expect((await getEvents(FIXTURE.share.id))[0]).toEqual(stored);
  });

  it('keeps a body that is not plain JSON intact', async () => {
    const stored: ShareEvent = {
      ...event(1),
      type: 'comment.edited',
      payload: {
        $type: 'comment.edited',
        commentId: FIXTURE.comment.id,
        body: BODY,
      },
    };

    await putEvents([stored]);

    expect((await getEvents(FIXTURE.share.id))[0]?.payload).toEqual(
      stored.payload,
    );
  });
});

describe('getLastSeq', () => {
  it('returns null while the share has no events', async () => {
    await expect(getLastSeq(FIXTURE.share.id)).resolves.toBe(null);
  });

  it('returns the highest sequence stored for the share', async () => {
    await putEvents([event(1), event(3), event(2)]);

    await expect(getLastSeq(FIXTURE.share.id)).resolves.toBe(3);
  });

  it('ignores the sequences of other shares', async () => {
    await putEvents([event(1), event(9, FIXTURE.share.alt)]);

    await expect(getLastSeq(FIXTURE.share.id)).resolves.toBe(1);
  });

  it('returns null when only other shares have events', async () => {
    await putEvents([event(9, FIXTURE.share.alt)]);

    await expect(getLastSeq(FIXTURE.share.id)).resolves.toBe(null);
  });
});
