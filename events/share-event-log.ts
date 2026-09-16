import {z} from 'zod';

import {isDefined} from '@/utils/defined';
import {getEvents, getLastSeq, putEvents} from '@/events/idb';
import {ShareEvent} from '@/events/schemas';

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

export class ShareEventLogSync {
  readonly #shareId: string;
  #isPolling = false;

  constructor(shareId: string) {
    this.#shareId = shareId;
  }

  async hydrate() {
    await this.#pull();
    return getEvents(this.#shareId);
  }

  startPolling(onBatch: (events: readonly ShareEvent[]) => void) {
    let intervalRef: ReturnType<typeof setInterval> | null = null;

    const getInterval = () =>
      document.visibilityState === 'visible'
        ? ACTIVE_POLL_INTERVAL
        : BACKGROUND_POLL_INTERVAL;

    const poll = async () => {
      if (this.#isPolling) {
        return;
      }

      this.#isPolling = true;

      try {
        const events = await this.#pull();
        if (events.length > 0) {
          onBatch(events);
        }
      } catch {
        /* Retried on the next interval */
      } finally {
        this.#isPolling = false;
      }
    };

    const resetInterval = () => {
      if (isDefined(intervalRef)) {
        clearInterval(intervalRef);
      }
      intervalRef = setInterval(() => void poll(), getInterval());
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
      if (isDefined(intervalRef)) {
        clearInterval(intervalRef);
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }

  async #pull() {
    const lastSeq = await getLastSeq(this.#shareId);
    const afterSeq = isDefined(lastSeq) && lastSeq > 0 ? lastSeq : null;
    const events = await fetchEvents(this.#shareId, afterSeq);

    if (events.length > 0) {
      await putEvents(events);
    }
    return events;
  }
}

const hydratePromises = new Map<
  string,
  Promise<{events: ShareEvent[]; sync: ShareEventLogSync}>
>();

export function hydrateShareEventLog(shareId: string) {
  let hydratePromise = hydratePromises.get(shareId);
  if (!isDefined(hydratePromise)) {
    hydratePromise = (async () => {
      const sync = new ShareEventLogSync(shareId);
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
