import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import type {ShareEvent} from '@/events/schemas';
import {FIXTURE} from '@/fixtures/fixture';
import {GET} from './route';

const {getEvents} = vi.hoisted(() => ({
  getEvents: vi.fn<() => readonly ShareEvent[]>(),
}));

vi.mock('@/db/events', () => ({getEvents}));

const EVENT = {
  id: FIXTURE.event.id,
  shareId: FIXTURE.share.id,
  seq: 4,
  type: 'thread.resolved',
  subjectId: FIXTURE.thread.id,
  actorId: FIXTURE.actor.id,
  payload: {
    $type: 'thread.resolved',
    threadId: FIXTURE.thread.id,
  },
  createdAt: FIXTURE.time.created,
} as const satisfies ShareEvent;

function request(search = '') {
  return new NextRequest(
    `${env.BASE_URL}/api/shares/${FIXTURE.share.id}/events${search}`,
  );
}

function context() {
  return {params: Promise.resolve({shareId: FIXTURE.share.id})};
}

beforeEach(() => {
  getEvents.mockReset();
  getEvents.mockResolvedValue([EVENT]);
});

describe('GET', () => {
  it('returns 200 for a share event query', async () => {
    const response = await GET(request(), context());

    expect(response.status).toBe(200);
  });

  it('returns share events as JSON', async () => {
    const response = await GET(request(), context());

    expect(await response.json()).toEqual({ok: true, events: [EVENT]});
  });

  it('disables caching on the response', async () => {
    const response = await GET(request(), context());

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('starts from the beginning when no cursor is given', async () => {
    await GET(request(), context());

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(FIXTURE.share.id, 0);
  });

  it('forwards the afterSeq cursor', async () => {
    await GET(request('?afterSeq=7'), context());

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(FIXTURE.share.id, 7);
  });

  it.each([
    {name: 'non-numeric cursor', search: '?afterSeq=abc'},
    {name: 'empty cursor', search: '?afterSeq='},
  ])('falls back to the beginning for $name', async ({search}) => {
    await GET(request(search), context());

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(FIXTURE.share.id, 0);
  });

  it('returns an empty event list', async () => {
    getEvents.mockResolvedValue([]);

    const response = await GET(request(), context());

    expect(await response.json()).toEqual({ok: true, events: []});
  });
});
