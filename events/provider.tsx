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
import type {FoldedShareState} from './state';
import {EMPTY_FOLDED_STATE, ShareState} from './state';
import {hydrateShareEvents, type ShareEventsSync} from './sync';

export const ShareStoreContext = createContext<ShareState>(null as never);

export const ShareStateContext = createContext<FoldedShareState>(null as never);

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
    <ShareStoreProvider events={events} sync={sync}>
      {children}
    </ShareStoreProvider>
  );
}

function ShareStoreProvider({
  events,
  sync,
  children,
}: {
  readonly events: readonly ShareEvent[];
  readonly sync: ShareEventsSync;
  readonly children: React.ReactNode;
}) {
  const [store] = useState(() => {
    const state = new ShareState();
    state.ingest(events);
    return state;
  });

  useEffect(() => {
    return sync.startPolling((batch) => {
      store.ingest(batch);
    });
  }, [store, sync]);

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );

  return (
    <ShareStoreContext value={store}>
      <ShareStateContext value={snapshot}>{children}</ShareStateContext>
    </ShareStoreContext>
  );
}

function getServerSnapshot() {
  return EMPTY_FOLDED_STATE;
}
