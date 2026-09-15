import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import type {ShareEvent} from '@/events/schemas';
import {GET} from './route';

const {getEvents} = vi.hoisted(() => ({
  getEvents: vi.fn<() => readonly ShareEvent[]>(),
}));

vi.mock('@/db/events', () => ({getEvents}));

const SHARE_ID = '00000000-0000-4000-8000-000000000001';

const EVENT = {
  id: '00000000-0000-4000-8000-000000000002',
  shareId: SHARE_ID,
  seq: 4,
  type: 'thread.resolved',
  subjectId: '00000000-0000-4000-8000-000000000003',
  actorId: 'actor-id',
  payload: {
    $type: 'thread.resolved',
    threadId: '00000000-0000-4000-8000-000000000003',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
} as const satisfies ShareEvent;

function request(search = '') {
  return new NextRequest(
    `${env.BASE_URL}/api/shares/${SHARE_ID}/events${search}`,
  );
}

function context() {
  return {params: Promise.resolve({shareId: SHARE_ID})};
}

beforeEach(() => {
  getEvents.mockReset();
  getEvents.mockResolvedValue([EVENT]);
});

describe('GET', () => {
  it('returns events for the share', async () => {
    const response = await GET(request(), context());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ok: true, events: [EVENT]});
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('starts from the beginning when no cursor is given', async () => {
    await GET(request(), context());

    expect(getEvents).toHaveBeenCalledWith(SHARE_ID, 0);
  });

  it('forwards the afterSeq cursor', async () => {
    await GET(request('?afterSeq=7'), context());

    expect(getEvents).toHaveBeenCalledWith(SHARE_ID, 7);
  });

  it.each([
    {name: 'non-numeric cursor', search: '?afterSeq=abc'},
    {name: 'empty cursor', search: '?afterSeq='},
  ])('falls back to the beginning for $name', async ({search}) => {
    await GET(request(search), context());

    expect(getEvents).toHaveBeenCalledWith(SHARE_ID, 0);
  });

  it('returns an empty event list', async () => {
    getEvents.mockResolvedValue([]);

    const response = await GET(request(), context());

    expect(await response.json()).toEqual({ok: true, events: []});
  });
});
