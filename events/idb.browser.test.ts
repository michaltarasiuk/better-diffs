import {afterAll, beforeEach, describe, expect, it} from 'vitest';

import {
  createCommentEdited,
  createLexicalBody,
  createShareEvent,
  createThreadResolved,
} from '@/testing/events';
import {uuid} from '@/testing/uuid';

import {
  clearEvents,
  closeEventDb,
  getEvents,
  getLastSeq,
  putEvents,
} from './idb';
import type {ShareEvent} from './schemas';

const body = createLexicalBody();
const shareId = uuid();

function createEventAt(seq: number, overrides: Partial<ShareEvent> = {}) {
  return createShareEvent(createThreadResolved(), {
    id: `event-${overrides.shareId ?? shareId}-${seq}`,
    seq,
    shareId,
    ...overrides,
  });
}

beforeEach(() => clearEvents());

afterAll(() => closeEventDb());

describe('putEvents', () => {
  it('stores events so they can be read back', async () => {
    await putEvents([createEventAt(1), createEventAt(2)]);

    expect((await getEvents(shareId)).map((event) => event.seq)).toEqual([
      1, 2,
    ]);
  });

  it('accepts an empty batch', async () => {
    await expect(putEvents([])).resolves.toBeUndefined();
  });

  it('leaves the store empty after an empty batch', async () => {
    await putEvents([]);

    await expect(getEvents(shareId)).resolves.toEqual([]);
  });

  it('replaces an event that is stored twice', async () => {
    await putEvents([createEventAt(1)]);
    await putEvents([createEventAt(1)]);

    await expect(getEvents(shareId)).resolves.toHaveLength(1);
  });

  it('keeps events written by separate calls', async () => {
    await putEvents([createEventAt(1)]);
    await putEvents([createEventAt(2)]);

    expect((await getEvents(shareId)).map((event) => event.seq)).toEqual([
      1, 2,
    ]);
  });
});

describe('getEvents', () => {
  it('returns an empty log for a share it has never seen', async () => {
    await expect(getEvents(shareId)).resolves.toEqual([]);
  });

  it('orders the log by sequence regardless of write order', async () => {
    await putEvents([createEventAt(3), createEventAt(1), createEventAt(2)]);

    expect((await getEvents(shareId)).map((event) => event.seq)).toEqual([
      1, 2, 3,
    ]);
  });

  it('returns only one event for the requested share', async () => {
    await putEvents([createEventAt(1), createEventAt(1, {shareId: uuid()})]);

    expect(await getEvents(shareId)).toHaveLength(1);
  });

  it('scopes results to the requested share', async () => {
    await putEvents([createEventAt(1), createEventAt(1, {shareId: uuid()})]);

    expect((await getEvents(shareId))[0]?.shareId).toBe(shareId);
  });

  it('round-trips the whole event', async () => {
    const stored = {
      ...createEventAt(1),
      payload: {...createEventAt(1).payload},
    } as ShareEvent;

    await putEvents([stored]);

    expect((await getEvents(shareId))[0]).toEqual(stored);
  });

  it('keeps a body that is not plain JSON intact', async () => {
    const edited = createCommentEdited({body});
    const stored: ShareEvent = {
      ...createEventAt(1),
      type: 'comment.edited',
      payload: edited,
    };

    await putEvents([stored]);

    expect((await getEvents(shareId))[0]?.payload).toEqual(stored.payload);
  });
});

describe('getLastSeq', () => {
  it('returns null while the share has no events', async () => {
    await expect(getLastSeq(shareId)).resolves.toBe(null);
  });

  it('returns the highest sequence stored for the share', async () => {
    await putEvents([createEventAt(1), createEventAt(3), createEventAt(2)]);

    await expect(getLastSeq(shareId)).resolves.toBe(3);
  });

  it('ignores the sequences of other shares', async () => {
    await putEvents([createEventAt(1), createEventAt(9, {shareId: uuid()})]);

    await expect(getLastSeq(shareId)).resolves.toBe(1);
  });

  it('returns null when only other shares have events', async () => {
    await putEvents([createEventAt(9, {shareId: uuid()})]);

    await expect(getLastSeq(shareId)).resolves.toBe(null);
  });
});
