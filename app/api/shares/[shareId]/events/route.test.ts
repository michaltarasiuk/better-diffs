import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {ShareEvent} from '@/events/schemas';
import {env} from '@/env';
import {GET} from './route';

const {getEvents} = vi.hoisted(() => ({
  getEvents: vi.fn<() => readonly ShareEvent[]>(),
}));

vi.mock('@/db/events', () => ({getEvents}));

const SHARE_ID = '00000000-0000-4000-8000-000000000001';

function get(search = '') {
  return new NextRequest(
    `${env.BASE_URL}/api/shares/${SHARE_ID}/events${search}`,
  );
}

function context() {
  return {params: Promise.resolve({shareId: SHARE_ID})};
}

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

beforeEach(() => {
  getEvents.mockReset();
  getEvents.mockResolvedValue([EVENT]);
});

describe('GET', () => {
  it('returns the events for the share', async () => {
    const response = await GET(get(), context());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ok: true, events: [EVENT]});
  });

  it('never lets a response be cached', async () => {
    const response = await GET(get(), context());

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('starts from the beginning when no cursor is given', async () => {
    await GET(get(), context());

    expect(getEvents).toHaveBeenCalledWith(SHARE_ID, 0);
  });

  it('forwards the afterSeq cursor', async () => {
    await GET(get('?afterSeq=7'), context());

    expect(getEvents).toHaveBeenCalledWith(SHARE_ID, 7);
  });

  it.each([
    {name: 'a non-numeric cursor', search: '?afterSeq=abc'},
    {name: 'an empty cursor', search: '?afterSeq='},
  ])('falls back to the beginning for $name', async ({search}) => {
    await GET(get(search), context());

    expect(getEvents).toHaveBeenCalledWith(SHARE_ID, 0);
  });

  it('returns an empty log without failing', async () => {
    getEvents.mockResolvedValue([]);

    const response = await GET(get(), context());

    await expect(response.json()).resolves.toEqual({ok: true, events: []});
  });
});
