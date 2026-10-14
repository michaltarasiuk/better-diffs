'use client';

import {
  createContext,
  startTransition,
  useEffect,
  useEffectEvent,
  useOptimistic,
  useReducer,
} from 'react';

import type {ShareSnapshot} from './schemas';
import {
  applyOptimistic,
  ingest,
  initialState,
  type OptimisticChange,
  type ShareState,
} from './state';
import {fetchEvents, startPolling} from './sync';

interface ShareActions {
  readonly optimistic: (
    changes: readonly OptimisticChange[],
    save: () => Promise<unknown>,
  ) => Promise<boolean>;
}

export const ShareStateContext = createContext<ShareState>(null as never);

export const ShareActionsContext = createContext<ShareActions>(null as never);

export function ShareEventsProvider({
  shareId,
  snapshot,
  children,
}: {
  readonly shareId: string;
  readonly snapshot: ShareSnapshot;
  readonly children: React.ReactNode;
}) {
  const [confirmed, dispatch] = useReducer(ingest, snapshot, initialState);
  const [state, addOptimistic] = useOptimistic(confirmed, applyOptimistic);

  async function refresh() {
    dispatch(await fetchEvents(shareId, confirmed.seq));
  }

  const poll = useEffectEvent(refresh);

  useEffect(() => startPolling(poll), []);

  function optimistic(
    changes: readonly OptimisticChange[],
    save: () => Promise<unknown>,
  ) {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        for (const change of changes) {
          addOptimistic(change);
        }

        try {
          await save();
        } catch {
          resolve(false);
          return;
        }

        try {
          await refresh();
        } catch {
          // Shown by the next poll instead
        }
        resolve(true);
      });
    });
  }

  return (
    <ShareActionsContext value={{optimistic}}>
      <ShareStateContext value={state}>{children}</ShareStateContext>
    </ShareActionsContext>
  );
}
