import {describe, expect, it} from 'vitest';

import {insertUser, setupTestDb} from '@/db/__tests__/setup';
import {appendEvents} from '@/db/events';
import {createShare} from '@/db/shares';
import {env} from '@/env';
import {ShareEvent} from '@/events/schemas';
import {newId} from '@/utils/new-id';

import {GET} from '../route';

setupTestDb();

function get(shareId: string, search = '') {
  const request = new Request(
    `${env.BASE_URL}/api/shares/${shareId}/events${search}`,
  );
  return GET(request, {params: Promise.resolve({shareId})});
}

async function shareWithEvents(count: number) {
  const {id: actorId} = await insertUser();
  const shareId = await createShare([]);
  await appendEvents(
    shareId,
    actorId,
    Array.from({length: count}, () => ({
      $type: 'thread.resolved' as const,
      threadId: newId(),
    })),
  );
  return shareId;
}

describe('GET', () => {
  it('returns all events of the share', async () => {
    const shareId = await shareWithEvents(2);

    const response = await get(shareId);
    const {events} = await response.json();

    expect(response.status).toBe(200);
    expect(events).toHaveLength(2);
    expect(events.map((event: unknown) => ShareEvent.parse(event).seq)).toEqual(
      [1, 2],
    );
  });

  it('returns events after the given seq', async () => {
    const shareId = await shareWithEvents(3);

    const response = await get(shareId, '?afterSeq=2');
    const {events} = await response.json();

    expect(events.map(({seq}: ShareEvent) => seq)).toEqual([3]);
  });

  it('is never cached', async () => {
    const shareId = await shareWithEvents(0);

    const response = await get(shareId);

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('returns not found for an unknown share', async () => {
    const shareId = newId();

    const response = await get(shareId);

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      error: {reason: 'SHARE_NOT_FOUND', metadata: {shareId}},
    });
  });

  it.each([
    ['a negative', '-1'],
    ['a fractional', '1.5'],
    ['a non-numeric', 'abc'],
  ])('rejects %s afterSeq', async (_name, afterSeq) => {
    const shareId = await shareWithEvents(0);

    const response = await get(shareId, `?afterSeq=${afterSeq}`);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        reason: 'INVALID_FIELDS',
        fieldViolations: [{field: 'afterSeq'}],
      },
    });
  });
});
