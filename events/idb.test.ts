import {afterAll, beforeEach, describe, expect, it} from 'vitest';

import {
  createLexicalBody,
  createShareEvent,
  createThreadResolved,
} from '@/testing/factories/events';
import {COMMENT_ID, SHARE_ID, SHARE_ID_SECONDARY} from '@/testing/ids';
import {
  clearEvents,
  closeEventDb,
  getEvents,
  getLastSeq,
  putEvents,
} from './idb';
import type {ShareEvent} from './schemas';

const body = createLexicalBody();

function createShareEventAt(
  seq: number,
  overrides: Partial<Pick<ShareEvent, 'shareId'>> = {},
) {
  const {shareId = SHARE_ID} = overrides;
  return createShareEvent(createThreadResolved(), {
    id: `event-${shareId}-${seq}`,
    shareId,
    seq,
  });
}

beforeEach(() => clearEvents());

afterAll(() => closeEventDb());

describe('putEvents', () => {
  it('stores events so they can be read back', async () => {
    await putEvents([createShareEventAt(1), createShareEventAt(2)]);

    expect((await getEvents(SHARE_ID)).map((it) => it.seq)).toEqual([1, 2]);
  });

  it('accepts an empty batch', async () => {
    await expect(putEvents([])).resolves.toBeUndefined();
  });

  it('leaves the store empty after an empty batch', async () => {
    await putEvents([]);

    await expect(getEvents(SHARE_ID)).resolves.toEqual([]);
  });

  it('replaces an event that is stored twice', async () => {
    await putEvents([createShareEventAt(1)]);
    await putEvents([createShareEventAt(1)]);

    await expect(getEvents(SHARE_ID)).resolves.toHaveLength(1);
  });

  it('keeps events written by separate calls', async () => {
    await putEvents([createShareEventAt(1)]);
    await putEvents([createShareEventAt(2)]);

    expect((await getEvents(SHARE_ID)).map((it) => it.seq)).toEqual([1, 2]);
  });
});

describe('getEvents', () => {
  it('returns an empty log for a share it has never seen', async () => {
    await expect(getEvents(SHARE_ID)).resolves.toEqual([]);
  });

  it('orders the log by sequence regardless of write order', async () => {
    await putEvents([
      createShareEventAt(3),
      createShareEventAt(1),
      createShareEventAt(2),
    ]);

    expect((await getEvents(SHARE_ID)).map((it) => it.seq)).toEqual([1, 2, 3]);
  });

  it('returns only one event for the requested share', async () => {
    await putEvents([
      createShareEventAt(1),
      createShareEventAt(1, {shareId: SHARE_ID_SECONDARY}),
    ]);

    expect(await getEvents(SHARE_ID)).toHaveLength(1);
  });

  it('scopes results to the requested share', async () => {
    await putEvents([
      createShareEventAt(1),
      createShareEventAt(1, {shareId: SHARE_ID_SECONDARY}),
    ]);

    expect((await getEvents(SHARE_ID))[0]?.shareId).toBe(SHARE_ID);
  });

  it('round-trips the whole event', async () => {
    const stored = {
      ...createShareEventAt(1),
      payload: {...createShareEventAt(1).payload},
    } as ShareEvent;

    await putEvents([stored]);

    expect((await getEvents(SHARE_ID))[0]).toEqual(stored);
  });

  it('keeps a body that is not plain JSON intact', async () => {
    const stored: ShareEvent = {
      ...createShareEventAt(1),
      type: 'comment.edited',
      payload: {
        $type: 'comment.edited',
        commentId: COMMENT_ID,
        body,
      },
    };

    await putEvents([stored]);

    expect((await getEvents(SHARE_ID))[0]?.payload).toEqual(stored.payload);
  });
});

describe('getLastSeq', () => {
  it('returns null while the share has no events', async () => {
    await expect(getLastSeq(SHARE_ID)).resolves.toBe(null);
  });

  it('returns the highest sequence stored for the share', async () => {
    await putEvents([
      createShareEventAt(1),
      createShareEventAt(3),
      createShareEventAt(2),
    ]);

    await expect(getLastSeq(SHARE_ID)).resolves.toBe(3);
  });

  it('ignores the sequences of other shares', async () => {
    await putEvents([
      createShareEventAt(1),
      createShareEventAt(9, {shareId: SHARE_ID_SECONDARY}),
    ]);

    await expect(getLastSeq(SHARE_ID)).resolves.toBe(1);
  });

  it('returns null when only other shares have events', async () => {
    await putEvents([createShareEventAt(9, {shareId: SHARE_ID_SECONDARY})]);

    await expect(getLastSeq(SHARE_ID)).resolves.toBe(null);
  });
});
