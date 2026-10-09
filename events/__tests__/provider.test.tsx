// @vitest-environment jsdom

import {act, render, screen} from '@testing-library/react';
import {Suspense, use} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {newId} from '@/utils/new-id';

import {
  FoldedStateContext,
  ShareEventsProvider,
  ShareStateContext,
} from '../provider';
import type {ShareEvent, ShareEventPayload} from '../schemas';
import type {ShareEventsSync} from '../sync';

const {hydrateShareEvents} = vi.hoisted(() => ({
  hydrateShareEvents: vi.fn<typeof import('../sync').hydrateShareEvents>(),
}));

vi.mock('../sync', () => ({hydrateShareEvents}));

const SHARE_ID = newId();

type StartPolling = ShareEventsSync['startPolling'];

let onBatch: Parameters<StartPolling>[1];
const stopPolling = vi.fn<ReturnType<StartPolling>>();
const startPolling = vi.fn<StartPolling>((_afterSeq, callback) => {
  onBatch = callback;
  return stopPolling;
});

function shareEvent(seq: number, payload: ShareEventPayload): ShareEvent {
  return {
    id: newId(),
    shareId: SHARE_ID,
    seq,
    type: payload.$type,
    subjectId: 'threadId' in payload ? payload.threadId : newId(),
    actorId: 'alice',
    actor: {name: 'Alice', image: null},
    payload,
    createdAt: new Date().toISOString(),
  };
}

function opened(seq: number) {
  return shareEvent(seq, {
    $type: 'thread.opened',
    threadId: newId(),
    anchor: {shareId: SHARE_ID, filePath: 'a.ts', side: 'additions', line: 1},
  });
}

type Hydration = Awaited<ReturnType<typeof hydrateShareEvents>>;

// React reads a settled promise synchronously instead of suspending on it.
function settled(result: PromiseSettledResult<Hydration>) {
  const promise =
    result.status === 'fulfilled'
      ? Promise.resolve(result.value)
      : Promise.reject(result.reason);
  promise.catch(() => {});
  return Object.assign(promise, result);
}

function hydrateWith(events: ShareEvent[]) {
  const sync = {startPolling} as unknown as ShareEventsSync;
  hydrateShareEvents.mockReturnValue(
    settled({status: 'fulfilled', value: {events, sync}}),
  );
}

function ThreadCount() {
  const {threads, version} = use(FoldedStateContext);
  return (
    <output>
      {threads.size} threads, version {version}
    </output>
  );
}

function renderProvider(children: React.ReactNode = <ThreadCount />) {
  return render(
    <Suspense fallback="Loading">
      <ShareEventsProvider shareId={SHARE_ID}>{children}</ShareEventsProvider>
    </Suspense>,
  );
}

beforeEach(() => {
  hydrateWith([]);
});

describe('ShareEventsProvider', () => {
  it('hydrates events for the share', async () => {
    hydrateWith([opened(1), opened(2)]);

    renderProvider();

    expect(hydrateShareEvents).toHaveBeenCalledWith(SHARE_ID);
    expect(screen.getByRole('status')).toHaveTextContent(
      '2 threads, version 1',
    );
  });

  it('applies polled batches', async () => {
    hydrateWith([opened(1)]);
    renderProvider();

    act(() => onBatch([opened(2), opened(3)]));

    expect(screen.getByRole('status')).toHaveTextContent(
      '3 threads, version 2',
    );
  });

  it('exposes the share state for optimistic updates', async () => {
    let state: React.ContextType<typeof ShareStateContext> | undefined;
    function CaptureState() {
      state = use(ShareStateContext);
      return null;
    }
    renderProvider(
      <>
        <CaptureState />
        <ThreadCount />
      </>,
    );

    act(() => {
      state!.optimistic({
        actorId: 'alice',
        actor: {name: 'Alice', image: null},
        createdAt: new Date().toISOString(),
        payload: opened(1).payload,
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent('1 threads');
  });

  it('stops polling on unmount', async () => {
    const {unmount} = renderProvider();
    expect(startPolling).toHaveBeenCalledOnce();

    unmount();

    expect(stopPolling).toHaveBeenCalledOnce();
  });

  it('renders nothing when hydration fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    hydrateShareEvents.mockReturnValue(
      settled({status: 'rejected', reason: new Error('Offline')}),
    );

    const {container} = renderProvider();

    expect(container).toBeEmptyDOMElement();
  });
});
