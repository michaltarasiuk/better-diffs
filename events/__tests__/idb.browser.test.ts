import {afterAll, beforeEach, describe, expect, it} from 'vitest';

import {newId} from '@/utils/new-id';

import {
  clearEvents,
  closeEventDb,
  getEvents,
  getLastSeq,
  putEvents,
} from '../idb';
import type {ShareEvent} from '../schemas';

function shareEvent(shareId: string, seq: number): ShareEvent {
  const threadId = newId();
  return {
    id: newId(),
    shareId,
    seq,
    type: 'thread.resolved',
    subjectId: threadId,
    actorId: newId(),
    actor: {name: 'Alice', image: null},
    payload: {$type: 'thread.resolved', threadId},
    createdAt: new Date().toISOString(),
  };
}

let shareId: string;

beforeEach(async () => {
  shareId = newId();
  await clearEvents();
});

afterAll(closeEventDb);

describe('getEvents', () => {
  it('returns nothing for an unknown share', async () => {
    await expect(getEvents(shareId)).resolves.toEqual([]);
  });

  it('returns stored events in seq order', async () => {
    const events = [3, 1, 2].map((seq) => shareEvent(shareId, seq));

    await putEvents(events);

    const stored = await getEvents(shareId);
    expect(stored.map(({seq}) => seq)).toEqual([1, 2, 3]);
    expect(stored).toContainEqual(events[0]);
  });

  it('only returns events of the given share', async () => {
    await putEvents([shareEvent(shareId, 1), shareEvent(newId(), 2)]);

    const stored = await getEvents(shareId);

    expect(stored.map(({seq}) => seq)).toEqual([1]);
  });
});

describe('getLastSeq', () => {
  it('returns null for an unknown share', async () => {
    await expect(getLastSeq(shareId)).resolves.toBe(null);
  });

  it('returns the highest stored seq', async () => {
    await putEvents([2, 10, 9].map((seq) => shareEvent(shareId, seq)));

    await expect(getLastSeq(shareId)).resolves.toBe(10);
  });

  it('ignores other shares', async () => {
    await putEvents([shareEvent(shareId, 1), shareEvent(newId(), 5)]);

    await expect(getLastSeq(shareId)).resolves.toBe(1);
  });
});

describe('putEvents', () => {
  it('overwrites an event with the same id', async () => {
    const event = shareEvent(shareId, 1);
    await putEvents([event]);

    await putEvents([{...event, actor: {name: 'Bob', image: null}}]);

    const stored = await getEvents(shareId);
    expect(stored).toHaveLength(1);
    expect(stored[0]?.actor.name).toBe('Bob');
  });
});

describe('clearEvents', () => {
  it('removes events of every share', async () => {
    const otherShareId = newId();
    await putEvents([shareEvent(shareId, 1), shareEvent(otherShareId, 1)]);

    await clearEvents();

    await expect(getEvents(shareId)).resolves.toEqual([]);
    await expect(getEvents(otherShareId)).resolves.toEqual([]);
  });
});

describe('closeEventDb', () => {
  it('reopens the database on next use', async () => {
    await putEvents([shareEvent(shareId, 1)]);

    await closeEventDb();

    await expect(getLastSeq(shareId)).resolves.toBe(1);
  });
});
