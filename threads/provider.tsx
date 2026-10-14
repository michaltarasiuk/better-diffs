'use client';

import {
  createContext,
  startTransition,
  useEffect,
  useEffectEvent,
  useOptimistic,
  useReducer,
} from 'react';

import {isDefined} from '@/utils/is-defined';

import {type ThreadError, threadError} from './errors';
import type {ShareSnapshot} from './schemas';
import {
  applyOptimistic,
  initialState,
  type OptimisticChange,
  receive,
  type ShareState,
} from './state';
import {fetchSnapshot, startPolling} from './sync';

interface ShareActions {
  readonly optimistic: (
    changes: readonly OptimisticChange[],
    save: () => Promise<ThreadError | undefined>,
  ) => Promise<ThreadError | undefined>;
}

export const ShareStateContext = createContext<ShareState>(null as never);

export const ShareActionsContext = createContext<ShareActions>(null as never);

export function ThreadsProvider({
  shareId,
  snapshot,
  children,
}: {
  readonly shareId: string;
  readonly snapshot: ShareSnapshot;
  readonly children: React.ReactNode;
}) {
  const [confirmed, dispatch] = useReducer(receive, snapshot, initialState);
  const [state, addOptimistic] = useOptimistic(confirmed, applyOptimistic);

  async function refresh() {
    const next = await fetchSnapshot(shareId, confirmed.revision);
    if (isDefined(next)) {
      dispatch(next);
    }
  }

  const poll = useEffectEvent(refresh);

  useEffect(() => startPolling(poll), []);

  function optimistic(
    changes: readonly OptimisticChange[],
    save: () => Promise<ThreadError | undefined>,
  ) {
    return new Promise<ThreadError | undefined>((resolve) => {
      startTransition(async () => {
        for (const change of changes) {
          addOptimistic(change);
        }

        let error: ThreadError | undefined;
        try {
          error = await save();
        } catch {
          error = threadError('SAVE_FAILED', 'The change could not be saved');
        }
        if (isDefined(error)) {
          resolve(error);
          return;
        }

        try {
          await refresh();
        } catch {
          // Shown by the next poll instead
        }
        resolve(undefined);
      });
    });
  }

  return (
    <ShareActionsContext value={{optimistic}}>
      <ShareStateContext value={state}>{children}</ShareStateContext>
    </ShareActionsContext>
  );
}
