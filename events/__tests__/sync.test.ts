// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ApiError} from '@/http/error';
import {newId} from '@/utils/new-id';

import type {ShareEvent} from '../schemas';
import {fetchEvents, startPolling} from '../sync';

const ACTIVE_POLL_INTERVAL = 3_000;
const BACKGROUND_POLL_INTERVAL = 30_000;

function setVisibility(visibilityState: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibilityState);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('fetchEvents', () => {
  it('fetches the events after the given seq', async () => {
    const shareId = newId();
    const events: ShareEvent[] = [
      {
        id: newId(),
        shareId,
        seq: 5,
        type: 'comment.deleted',
        subjectId: newId(),
        actorId: 'alice',
        createdAt: new Date().toISOString(),
      },
    ];
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({events}),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(fetchEvents(shareId, 4)).resolves.toEqual(events);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `/api/shares/${shareId}/events?afterSeq=4`,
      {cache: 'no-store'},
    );
  });

  it('rejects when the server responds with an error', async () => {
    const error = new ApiError('NOT_FOUND', 'Share not found.', {
      reason: 'SHARE_NOT_FOUND',
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json(error, {status: error.httpStatus})),
    );

    await expect(fetchEvents(newId(), 0)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
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
    const poll = vi.fn(async () => {});
    const stop = startPolling(poll);

    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);
    expect(poll).toHaveBeenCalledTimes(2);

    stop();
  });

  it('keeps polling after a failed poll', async () => {
    const poll = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue();
    const stop = startPolling(poll);

    await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);

    expect(poll).toHaveBeenCalledTimes(2);

    stop();
  });

  it('skips a tick while the previous poll is in flight', async () => {
    let settle!: () => void;
    const poll = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        }),
    );
    const stop = startPolling(poll);

    await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL * 2);
    expect(poll).toHaveBeenCalledTimes(1);

    settle();
    await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);
    expect(poll).toHaveBeenCalledTimes(2);

    stop();
  });

  it('slows down in the background and catches up when visible', async () => {
    const poll = vi.fn(async () => {});
    const stop = startPolling(poll);
    await vi.advanceTimersByTimeAsync(0);

    setVisibility('hidden');
    await vi.advanceTimersByTimeAsync(BACKGROUND_POLL_INTERVAL - 1);
    expect(poll).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(poll).toHaveBeenCalledTimes(2);

    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(0);
    expect(poll).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL);
    expect(poll).toHaveBeenCalledTimes(4);

    stop();
  });

  it('stops polling and listening once stopped', async () => {
    const poll = vi.fn(async () => {});
    const stop = startPolling(poll);
    await vi.advanceTimersByTimeAsync(0);

    stop();
    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(BACKGROUND_POLL_INTERVAL);

    expect(poll).toHaveBeenCalledTimes(1);
  });
});
