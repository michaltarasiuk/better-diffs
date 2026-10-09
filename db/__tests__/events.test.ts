import {describe, expect, it} from 'vitest';

import type {ShareEventPayload} from '@/events/schemas';
import {newId} from '@/utils/new-id';

import {appendEvents, getEvents} from '../events';
import {createShare} from '../shares';
import {insertUser, setupTestDb} from './setup';

setupTestDb();

function resolved(threadId = newId()) {
  return {$type: 'thread.resolved', threadId} satisfies ShareEventPayload;
}

describe('appendEvents', () => {
  it('numbers events from one', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare([]);

    const appended = await appendEvents(shareId, actorId, [
      resolved(),
      resolved(),
    ]);

    expect(appended.map(({seq}) => seq)).toEqual([1, 2]);
  });

  it('keeps numbering across appends', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare([]);

    await appendEvents(shareId, actorId, [resolved(), resolved()]);
    const appended = await appendEvents(shareId, actorId, [resolved()]);

    expect(appended.map(({seq}) => seq)).toEqual([3]);
  });

  it('numbers each share separately', async () => {
    const {id: actorId} = await insertUser();
    const first = await createShare([]);
    const second = await createShare([]);

    await appendEvents(first, actorId, [resolved()]);
    const appended = await appendEvents(second, actorId, [resolved()]);

    expect(appended.map(({seq}) => seq)).toEqual([1]);
  });

  it('derives the type and subject from the payload', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare([]);
    const payload = {$type: 'comment.deleted', commentId: newId()} as const;

    const [event] = await appendEvents(shareId, actorId, [payload]);

    expect(event).toMatchObject({
      shareId,
      actorId,
      type: 'comment.deleted',
      subjectId: payload.commentId,
      payload,
    });
  });

  it('returns nothing for an empty batch', async () => {
    await expect(appendEvents(newId(), newId(), [])).resolves.toEqual([]);
  });

  it('throws for an unknown share', async () => {
    const {id: actorId} = await insertUser();
    const shareId = newId();

    await expect(appendEvents(shareId, actorId, [resolved()])).rejects.toThrow(
      `Share not found: ${shareId}`,
    );
  });

  it('rolls back the seq when the insert fails', async () => {
    const shareId = await createShare([]);
    const {id: actorId} = await insertUser();

    await expect(
      appendEvents(shareId, newId(), [resolved()]),
    ).rejects.toThrow();
    const [event] = await appendEvents(shareId, actorId, [resolved()]);

    expect(event?.seq).toBe(1);
  });
});

describe('getEvents', () => {
  it('returns events in seq order with their actor', async () => {
    const user = await insertUser({name: 'Alice', image: null});
    const shareId = await createShare([]);
    await appendEvents(shareId, user.id, [resolved(), resolved()]);
    await appendEvents(shareId, user.id, [resolved()]);

    const events = await getEvents(shareId);

    expect(events.map(({seq}) => seq)).toEqual([1, 2, 3]);
    expect(events[0]?.actor).toEqual({name: 'Alice', image: null});
  });

  it('returns events after the given seq', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare([]);
    await appendEvents(shareId, actorId, [resolved(), resolved(), resolved()]);

    const events = await getEvents(shareId, 1);

    expect(events.map(({seq}) => seq)).toEqual([2, 3]);
  });

  it('only returns events of the given share', async () => {
    const {id: actorId} = await insertUser();
    const shareId = await createShare([]);
    const otherShareId = await createShare([]);
    await appendEvents(otherShareId, actorId, [resolved()]);

    await expect(getEvents(shareId)).resolves.toEqual([]);
  });
});
