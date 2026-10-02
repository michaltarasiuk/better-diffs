import {z} from 'zod';

import {isDefined} from '@/utils/is-defined';
import {getEvents, getLastSeq, putEvents} from './idb';
import {ShareEvent} from './schemas';

const ACTIVE_POLL_INTERVAL = 3_000;
const BACKGROUND_POLL_INTERVAL = 30_000;

const OkResponse = z.instanceof(Response).properties({
  ok: z.literal(true),
  status: z.number().min(200).max(299),
});

const EventsResponse = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    events: z.array(ShareEvent),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

async function fetchEvents(shareId: string, afterSeq: number | null) {
  const searchParams = isDefined(afterSeq)
    ? `?${new URLSearchParams({afterSeq: String(afterSeq)})}`
    : '';
  const response = OkResponse.parse(
    await fetch(`/api/shares/${shareId}/events${searchParams}`, {
      cache: 'no-store',
    }),
  );
  const data = EventsResponse.parse(await response.json());

  if (!data.ok) {
    throw new Error(data.error);
  }
  return data.events;
}

export class ShareEventsSync {
  readonly #shareId: string;
  #isPulling = false;

  constructor(shareId: string) {
    this.#shareId = shareId;
  }

  async hydrate() {
    await this.#pull();
    return getEvents(this.#shareId);
  }

  startPolling(onBatch: (events: readonly ShareEvent[]) => void) {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const getInterval = () =>
      document.visibilityState === 'visible'
        ? ACTIVE_POLL_INTERVAL
        : BACKGROUND_POLL_INTERVAL;

    const poll = async () => {
      if (this.#isPulling) {
        return;
      }

      this.#isPulling = true;

      try {
        const events = await this.#pull();
        if (events.length > 0) {
          onBatch(events);
        }
      } catch {
        /* Retried on the next interval */
      } finally {
        this.#isPulling = false;
      }
    };

    const resetInterval = () => {
      if (isDefined(intervalId)) {
        clearInterval(intervalId);
      }
      intervalId = setInterval(() => void poll(), getInterval());
    };

    void poll();
    resetInterval();

    const onVisibilityChange = () => {
      resetInterval();
      if (document.visibilityState === 'visible') {
        void poll();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (isDefined(intervalId)) {
        clearInterval(intervalId);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }

  async #pull() {
    const lastSeq = await getLastSeq(this.#shareId);
    const events = await fetchEvents(this.#shareId, lastSeq);

    if (events.length > 0) {
      await putEvents(events);
    }
    return events;
  }
}

const hydratePromises = new Map<
  string,
  Promise<{events: ShareEvent[]; sync: ShareEventsSync}>
>();

export function hydrateShareEvents(shareId: string) {
  let hydratePromise = hydratePromises.get(shareId);
  if (!isDefined(hydratePromise)) {
    hydratePromise = (async () => {
      const sync = new ShareEventsSync(shareId);
      const events = await sync.hydrate();
      return {events, sync};
    })().catch((error) => {
      hydratePromises.delete(shareId);
      throw error;
    });
    hydratePromises.set(shareId, hydratePromise);
  }
  return hydratePromise;
}
