import {z} from 'zod';

import {ApiError} from '#/http/error';
import {fetchJson} from '#/http/fetch';
import {isDefined} from '#/utils/is-defined';

import {ShareSnapshot} from './schemas';

const ACTIVE_POLL_INTERVAL = 3_000;
const BACKGROUND_POLL_INTERVAL = 30_000;

const ThreadsResponse = z.object({
  snapshot: ShareSnapshot.nullable(),
});

export async function fetchSnapshot(shareId: string, afterRevision: number) {
  const searchParams = new URLSearchParams({
    afterRevision: String(afterRevision),
  });
  const {snapshot} = await fetchJson(
    `/api/shares/${shareId}/snapshot?${searchParams}`,
    ThreadsResponse,
    {cache: 'no-store'},
  );
  return snapshot;
}

export function startPolling(poll: () => Promise<void>) {
  let intervalId: ReturnType<typeof setInterval> | undefined;
  let isPolling = false;

  const tick = async () => {
    if (isPolling) {
      return;
    }

    isPolling = true;
    try {
      await poll();
    } catch (error) {
      if (isShareGone(error)) {
        stop();
      }
    } finally {
      isPolling = false;
    }
  };

  const resetInterval = () => {
    if (isDefined(intervalId)) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(
      () => void tick(),
      document.visibilityState === 'visible'
        ? ACTIVE_POLL_INTERVAL
        : BACKGROUND_POLL_INTERVAL,
    );
  };

  const onVisibilityChange = () => {
    resetInterval();
    if (document.visibilityState === 'visible') {
      void tick();
    }
  };

  const stop = () => {
    if (isDefined(intervalId)) {
      clearInterval(intervalId);
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  void tick();
  resetInterval();
  document.addEventListener('visibilitychange', onVisibilityChange);

  return stop;
}

function isShareGone(error: unknown) {
  return error instanceof ApiError && error.reason === 'SHARE_NOT_FOUND';
}
