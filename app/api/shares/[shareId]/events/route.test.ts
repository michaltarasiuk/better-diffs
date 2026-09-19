import {NextRequest} from 'next/server';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {env} from '@/env';
import {createShareEvent} from '@/testing/factories/events';
import {
  CREATED_AT,
  EVENT_ID,
  SHARE_ID,
  THREAD_ID,
  USER_ID,
} from '@/testing/ids';
import {GET} from './route';

const {getEvents} = vi.hoisted(() => ({
  getEvents: vi.fn<typeof import('@/db/events').getEvents>(),
}));

vi.mock('@/db/events', () => ({getEvents}));

const EVENT = createShareEvent({
  id: EVENT_ID,
  shareId: SHARE_ID,
  seq: 4,
  subjectId: THREAD_ID,
  actorId: USER_ID,
  createdAt: CREATED_AT,
});

function request(search = '') {
  return new NextRequest(
    `${env.BASE_URL}/api/shares/${SHARE_ID}/events${search}`,
  );
}

function context() {
  return {params: Promise.resolve({shareId: SHARE_ID})};
}

beforeEach(() => {
  getEvents.mockResolvedValue([EVENT]);
});

describe('GET', () => {
  it('returns 200 for a share event query', async () => {
    const response = await GET(request(), context());

    expect(response.status).toBe(200);
  });

  it('returns share events as JSON', async () => {
    const response = await GET(request(), context());

    expect(await response.json()).toEqual({
      ok: true,
      events: [EVENT],
    });
  });

  it('disables caching on the response', async () => {
    const response = await GET(request(), context());

    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('starts from the beginning when no cursor is given', async () => {
    await GET(request(), context());

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(SHARE_ID, 0);
  });

  it('forwards the afterSeq cursor', async () => {
    await GET(request('?afterSeq=7'), context());

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(SHARE_ID, 7);
  });

  it.each([
    {name: 'non-numeric cursor', search: '?afterSeq=abc'},
    {name: 'empty cursor', search: '?afterSeq='},
  ])('falls back to the beginning for $name', async ({search}) => {
    await GET(request(search), context());

    expect(getEvents).toHaveBeenCalledExactlyOnceWith(SHARE_ID, 0);
  });

  it('returns an empty event list', async () => {
    getEvents.mockResolvedValue([]);

    const response = await GET(request(), context());

    expect(await response.json()).toEqual({
      ok: true,
      events: [],
    });
  });
});
