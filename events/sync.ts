import {z} from 'zod';

import {fetchJson} from '@/http/fetch';
import {isDefined} from '@/utils/is-defined';

import {ShareEvent} from './schemas';

const ACTIVE_POLL_INTERVAL = 3_000;
const BACKGROUND_POLL_INTERVAL = 30_000;

const EventsResponse = z.object({
  events: z.array(ShareEvent),
});

export async function fetchEvents(shareId: string, afterSeq: number) {
  const searchParams = new URLSearchParams({afterSeq: String(afterSeq)});
  const {events} = await fetchJson(
    `/api/shares/${shareId}/events?${searchParams}`,
    EventsResponse,
    {cache: 'no-store'},
  );
  return events;
}

export function startPolling(poll: () => Promise<void>) {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isPolling = false;

  const tick = async () => {
    if (isPolling) {
      return;
    }

    isPolling = true;
    try {
      await poll();
    } catch {
      // Retried on the next interval
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

  void tick();
  resetInterval();
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    if (isDefined(intervalId)) {
      clearInterval(intervalId);
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
