'use client';

import {createContext, use} from 'react';
import {browser} from 'react-dom';
import z from 'zod';

import {EMPTY_FOLDED_STATE, foldEvents} from '@/lib/events/fold';
import {getEvents, getLastSeq, putEvents} from '@/lib/events/idb';
import {ErrorBoundary} from '@/lib/react/error-boundary';
import {isDefined} from '@/lib/utils/defined';

import {useShareId} from './use-share-id';

import type {FoldedShareState} from '@/lib/events/fold';
import type {ShareEvent} from '@/lib/events/schemas';

const EventsResponse = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    events: z.custom<ShareEvent[]>(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
]);

async function fetchEvents(shareId: string, afterSeq: number | null) {
  const params = new URLSearchParams();

  if (isDefined(afterSeq)) {
    params.set('afterSeq', String(afterSeq));
  }

  let url = `/api/shares/${shareId}/events`;
  if (params.size > 0) {
    url += `?${params}`;
  }

  const response = await fetch(url, {cache: 'no-store'});
  const data = EventsResponse.parse(await response.json());

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

  return getEvents(shareId);
}

const syncPromises = new Map<string, Promise<ShareEvent[]>>();

export const ShareStateContext =
  createContext<FoldedShareState>(EMPTY_FOLDED_STATE);

export function EventSync({children}: {readonly children: React.ReactNode}) {
  use(browser());

  const shareId = useShareId();

  let eventsPromise = syncPromises.get(shareId);
  if (!isDefined(eventsPromise)) {
    eventsPromise = syncEvents(shareId);
    syncPromises.set(shareId, eventsPromise);
  }

  const events = use(eventsPromise);
  const state = foldEvents(events);

  return (
    <ErrorBoundary resetKeys={[shareId]} fallback={null}>
      <ShareStateContext value={state}>{children}</ShareStateContext>;
    </ErrorBoundary>
  );
}
