'use client';

import {
  createContext,
  use,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import {browser} from 'react-dom';

import type {ShareEvent} from '@/events/schemas';
import {
  hydrateShareEvents,
  type ShareEventsSync,
} from '@/events/share-events-sync';
import type {FoldedShareState} from '@/events/share-state';
import {EMPTY_FOLDED_STATE, ShareState} from '@/events/share-state';
import {ErrorBoundary} from '@/react/error-boundary';

export const ShareStateContext =
  createContext<FoldedShareState>(EMPTY_FOLDED_STATE);

export const ShareStoreContext = createContext<ShareState>(null as never);

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
      <SyncedShareState hydratePromise={hydratePromise}>
        {children}
      </SyncedShareState>
    </ErrorBoundary>
  );
}

function SyncedShareState({
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
