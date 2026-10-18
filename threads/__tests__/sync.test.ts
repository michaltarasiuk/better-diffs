// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {ApiError} from '#/http/error';
import {newId} from '#/utils/new-id';

import type {ShareSnapshot} from '../schemas';
import {fetchSnapshot, startPolling} from '../sync';

const ACTIVE_POLL_INTERVAL = 3_000;
const BACKGROUND_POLL_INTERVAL = 30_000;

function setVisibility(visibilityState: DocumentVisibilityState) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibilityState);
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('fetchSnapshot', () => {
  it('fetches the snapshot changed after the given revision', async () => {
    const snapshot: ShareSnapshot = {revision: 5, threads: [], comments: []};
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({snapshot}),
    );
    vi.stubGlobal('fetch', fetch);
    const shareId = newId();

    await expect(fetchSnapshot(shareId, 4)).resolves.toEqual(snapshot);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `/api/shares/${shareId}/snapshot?afterRevision=4`,
      {cache: 'no-store'},
    );
  });

  it('resolves to null when nothing changed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => Response.json({snapshot: null})),
    );

    await expect(fetchSnapshot(newId(), 4)).resolves.toBeNull();
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

    await expect(fetchSnapshot(newId(), 0)).rejects.toMatchObject({
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

  it('stops polling once the share is gone', async () => {
    const poll = vi.fn<() => Promise<void>>().mockRejectedValue(
      new ApiError('NOT_FOUND', 'Share not found.', {
        reason: 'SHARE_NOT_FOUND',
      }),
    );
    startPolling(poll);

    await vi.advanceTimersByTimeAsync(ACTIVE_POLL_INTERVAL * 2);
    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(0);

    expect(poll).toHaveBeenCalledOnce();
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
