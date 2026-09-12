'use client';

import {createContext, use, useState, useSyncExternalStore} from 'react';
import {browser} from 'react-dom';
import z from 'zod';

import {ErrorBoundary} from '@/components/ErrorBoundary';
import {getEvents, getLastSeq, putEvents} from '@/events/idb';
import {ShareEvent} from '@/events/schemas';
import {EMPTY_FOLDED_STATE, ShareState} from '@/events/shareState';
import {isDefined} from '@/utils/defined';

import {useShareId} from './useShareId';

import type {FoldedShareState} from '@/events/shareState';

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
  const response = await fetch(`/api/shares/${shareId}/events${searchParams}`, {
    cache: 'no-store',
  });
  const json = await response.json();
  const data = EventsResponse.parse(json);

  if (!data.ok) {
    throw new Error(data.error);
  }
  return data.events;
}

async function syncEvents(shareId: string) {
  const lastSeq = await getLastSeq(shareId);
  const events = await fetchEvents(shareId, lastSeq);

  if (events.length > 0) {
    await putEvents(events);
  }
  return await getEvents(shareId);
}

const eventsPromises = new Map<string, Promise<ShareEvent[]>>();

function getEventsPromise(shareId: string) {
  let eventsPromise = eventsPromises.get(shareId);
  if (!isDefined(eventsPromise)) {
    eventsPromise = syncEvents(shareId).catch((error) => {
      eventsPromises.delete(shareId);
      throw error;
    });
    eventsPromises.set(shareId, eventsPromise);
  }
  return eventsPromise;
}

export const ShareStateContext =
  createContext<FoldedShareState>(EMPTY_FOLDED_STATE);

export function SyncEvents({children}: {readonly children: React.ReactNode}) {
  use(browser());

  const shareId = useShareId();
  const eventsPromise = getEventsPromise(shareId);

  return (
    <ErrorBoundary resetKeys={[shareId, eventsPromise]} fallback={null}>
      <SyncedShareState eventsPromise={eventsPromise}>
        {children}
      </SyncedShareState>
    </ErrorBoundary>
  );
}

function SyncedShareState({
  eventsPromise,
  children,
}: {
  readonly eventsPromise: Promise<ShareEvent[]>;
  readonly children: React.ReactNode;
}) {
  const events = use(eventsPromise);
  return <ShareStateProvider events={events}>{children}</ShareStateProvider>;
}

function ShareStateProvider({
  events,
  children,
}: {
  readonly events: readonly ShareEvent[];
  readonly children: React.ReactNode;
}) {
  const [store] = useState(() => {
    const state = new ShareState();
    state.ingest(events);
    return state;
  });

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );

  return <ShareStateContext value={snapshot}>{children}</ShareStateContext>;
}

function getServerSnapshot(): FoldedShareState {
  return EMPTY_FOLDED_STATE;
}
