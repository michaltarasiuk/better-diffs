// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ApiError} from '@/api/error';
import {newId} from '@/utils/new-id';

import type {ShareEvent} from '../schemas';
import {hydrateShareEvents, ShareEventsSync} from '../sync';

const {getEvents, getLastSeq, putEvents} = vi.hoisted(() => ({
  getEvents: vi.fn<typeof import('../idb').getEvents>(),
  getLastSeq: vi.fn<typeof import('../idb').getLastSeq>(),
  putEvents: vi.fn<typeof import('../idb').putEvents>(),
}));

vi.mock('../idb', () => ({getEvents, getLastSeq, putEvents}));

const ACTIVE_POLL_INTERVAL = 3_000;
const BACKGROUND_POLL_INTERVAL = 30_000;

let shareId: string;

function shareEvent(seq: number): ShareEvent {
  const threadId = newId();
  return {
    id: newId(),
    shareId,
    seq,
    type: 'thread.resolved',
    subjectId: threadId,
    actorId: 'alice',
    actor: {name: 'Alice', image: null},
    payload: {$type: 'thread.resolved', threadId},
    createdAt: new Date().toISOString(),
  };
}

function stubFetch(...batches: ShareEvent[][]) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    Response.json({events: batches.shift() ?? []}),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

function requestedUrls(fetch: ReturnType<typeof stubFetch>) {
  return fetch.mock.calls.map(([input]) => String(input));
}

function setVisibility(visibilityState: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibilityState);
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  shareId = newId();
  getLastSeq.mockResolvedValue(null);
  getEvents.mockResolvedValue([]);
  putEvents.mockResolvedValue();
});

describe('ShareEventsSync', () => {
  describe('hydrate', () => {
    it('fetches all events when nothing is cached', async () => {
      const fetch = stubFetch([]);

      await new ShareEventsSync(shareId).hydrate();

      expect(fetch).toHaveBeenCalledExactlyOnceWith(
        `/api/shares/${shareId}/events`,
        {cache: 'no-store'},
      );
    });

    it('fetches only events after the last cached seq', async () => {
      getLastSeq.mockResolvedValue(7);
      const fetch = stubFetch([]);

      await new ShareEventsSync(shareId).hydrate();

      expect(getLastSeq).toHaveBeenCalledWith(shareId);
      expect(requestedUrls(fetch)).toEqual([
        `/api/shares/${shareId}/events?afterSeq=7`,
      ]);
    });

    it('caches new events and returns everything cached', async () => {
      const events = [shareEvent(1), shareEvent(2)];
      const cached = [shareEvent(1)];
      stubFetch(events);
      getEvents.mockResolvedValue(cached);

      await expect(new ShareEventsSync(shareId).hydrate()).resolves.toBe(
        cached,
      );
      expect(putEvents).toHaveBeenCalledExactlyOnceWith(events);
      expect(getEvents).toHaveBeenCalledWith(shareId);
    });

    it('skips writing when there are no new events', async () => {
      stubFetch([]);

      await new ShareEventsSync(shareId).hydrate();

      expect(putEvents).not.toHaveBeenCalled();
    });

    it('rejects when the server responds with an error', async () => {
      const error = new ApiError('NOT_FOUND', 'Share not found.', {
        reason: 'SHARE_NOT_FOUND',
      });
      const response = Response.json(error, {status: error.httpStatus});
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));
      const sync = new ShareEventsSync(shareId);

      await expect(sync.hydrate()).rejects.toMatchObject({code: 'NOT_FOUND'});
    });
  });

  describe('startPolling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
      return () => {
        vi.useRealTimers();
      };
    });

    it('polls immediately and then on the active interval', async () => {
      const fetch = stubFetch();
      const stop = new ShareEventsSync(shareId).startPolling(vi.fn());

      await vi.advanceTimersByTimeAsync(0);
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);
      expect(fetch).toHaveBeenCalledTimes(2);

      stop();
    });

    it('delivers and caches new batches', async () => {
      const batch = [shareEvent(1)];
      stubFetch([], batch);
      const onBatch = vi.fn();
      const stop = new ShareEventsSync(shareId).startPolling(onBatch);

      await vi.advanceTimersByTimeAsync(0);
      expect(onBatch).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);
      expect(onBatch).toHaveBeenCalledExactlyOnceWith(batch);
      expect(putEvents).toHaveBeenCalledExactlyOnceWith(batch);

      stop();
    });

    it('keeps polling after a failed request', async () => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValue(Response.json({events: [shareEvent(1)]}));
      vi.stubGlobal('fetch', fetch);
      const onBatch = vi.fn();
      const stop = new ShareEventsSync(shareId).startPolling(onBatch);

      await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(onBatch).toHaveBeenCalledOnce();

      stop();
    });

    it('skips a tick while the previous poll is in flight', async () => {
      let resolve!: (response: Response) => void;
      const fetch = vi.fn<typeof globalThis.fetch>(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      );
      vi.stubGlobal('fetch', fetch);
      const stop = new ShareEventsSync(shareId).startPolling(vi.fn());

      await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL * 2);
      expect(fetch).toHaveBeenCalledTimes(1);

      resolve(Response.json({events: []}));
      await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);
      expect(fetch).toHaveBeenCalledTimes(2);

      stop();
    });

    it('slows down in the background and catches up when visible', async () => {
      const fetch = stubFetch();
      const stop = new ShareEventsSync(shareId).startPolling(vi.fn());
      await vi.advanceTimersByTimeAsync(0);

      setVisibility('hidden');
      await vi.advanceTimersByTimeAsync(BACKGROUND_POLL_INTERVAL - 1);
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(2);

      setVisibility('visible');
      await vi.advanceTimersByTimeAsync(0);
      expect(fetch).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);
      expect(fetch).toHaveBeenCalledTimes(4);

      stop();
    });

    it('stops polling and listening once stopped', async () => {
      const fetch = stubFetch();
      const stop = new ShareEventsSync(shareId).startPolling(vi.fn());
      await vi.advanceTimersByTimeAsync(0);

      stop();
      setVisibility('visible');
      await vi.advanceTimersByTimeAsync(BACKGROUND_POLL_INTERVAL);

      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('hydrateShareEvents', () => {
  it('shares one hydration per share', async () => {
    const fetch = stubFetch();

    const first = hydrateShareEvents(shareId);
    const second = hydrateShareEvents(shareId);

    expect(second).toBe(first);
    const {events, sync} = await first;
    expect(events).toEqual([]);
    expect(sync).toBeInstanceOf(ShareEventsSync);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('retries after a failed hydration', async () => {
    getLastSeq.mockRejectedValueOnce(new Error('IDB blocked'));
    stubFetch();

    await expect(hydrateShareEvents(shareId)).rejects.toThrow('IDB blocked');
    await expect(hydrateShareEvents(shareId)).resolves.toMatchObject({
      events: [],
    });
  });
});
