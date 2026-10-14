'use client';

import {
  createContext,
  startTransition,
  use,
  useEffect,
  useEffectEvent,
  useOptimistic,
  useReducer,
} from 'react';

import {isDefined} from '@/utils/is-defined';

import {threadError, type ThreadError} from './errors';
import type {ShareSnapshot} from './schemas';
import {
  applyOptimistic,
  initialState,
  receive,
  type OptimisticChange,
  type ShareState,
} from './state';
import {fetchSnapshot, startPolling} from './sync';

interface ShareActions {
  readonly optimistic: (
    changes: readonly OptimisticChange[],
    save: () => Promise<ThreadError | undefined>,
  ) => Promise<ThreadError | undefined>;
}

const ShareStateContext = createContext<ShareState | null>(null);

const ShareActionsContext = createContext<ShareActions | null>(null);

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

export function useShareState() {
  const state = use(ShareStateContext);
  if (!isDefined(state)) {
    throw new Error('useShareState must be used within ThreadsProvider');
  }
  return state;
}

export function useShareActions() {
  const actions = use(ShareActionsContext);
  if (!isDefined(actions)) {
    throw new Error('useShareActions must be used within ThreadsProvider');
  }
  return actions;
}
