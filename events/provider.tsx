'use client';

import {
  createContext,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import {browser} from 'react-dom';

import {ErrorBoundary} from 'react-error-boundary';

import type {ShareEvent} from './schemas';
import {EMPTY_FOLDED_STATE, ShareState, type FoldedState} from './state';
import {hydrateShareEvents, type ShareEventsSync} from './sync';

export const ShareStateContext = createContext<ShareState>(null as never);

export const FoldedStateContext = createContext<FoldedState>(null as never);

export function ShareEventsProvider({
  shareId,
  children,
}: {
  readonly shareId: string;
  readonly children: React.ReactNode;
}) {
  use(browser());

  const hydratePromise = hydrateShareEvents(shareId);

  return (
    <ErrorBoundary resetKeys={[shareId, hydratePromise]} fallback={null}>
      <HydratedShareEvents hydratePromise={hydratePromise}>
        {children}
      </HydratedShareEvents>
    </ErrorBoundary>
  );
}

function HydratedShareEvents({
  hydratePromise,
  children,
}: {
  readonly hydratePromise: ReturnType<typeof hydrateShareEvents>;
  readonly children: React.ReactNode;
}) {
  const {events, sync} = use(hydratePromise);
  return (
    <ShareStateProvider events={events} sync={sync}>
      {children}
    </ShareStateProvider>
  );
}

function ShareStateProvider({
  events,
  sync,
  children,
}: {
  readonly events: readonly ShareEvent[];
  readonly sync: ShareEventsSync;
  readonly children: React.ReactNode;
}) {
  const [state] = useState(() => {
    const shareState = new ShareState();
    shareState.ingest(events);
    return shareState;
  });

  useEffect(() => {
    return sync.startPolling((batch) => {
      state.ingest(batch);
    });
  }, [state, sync]);

  const snapshot = useSyncExternalStore(
    state.subscribe,
    state.getSnapshot,
    getServerSnapshot,
  );

  return (
    <ShareStateContext value={state}>
      <FoldedStateContext value={snapshot}>{children}</FoldedStateContext>
    </ShareStateContext>
  );
}

function getServerSnapshot() {
  return EMPTY_FOLDED_STATE;
}
