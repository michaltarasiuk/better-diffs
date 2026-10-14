// @vitest-environment jsdom

import {act, render, screen} from '@testing-library/react';
import {use} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {newId} from '@/utils/new-id';

import {
  ShareActionsContext,
  ShareEventsProvider,
  ShareStateContext,
} from '../provider';
import type {ShareEvent, ShareSnapshot, Thread} from '../schemas';
import type {OptimisticChange} from '../state';

const {fetchEvents, startPolling} = vi.hoisted(() => ({
  fetchEvents: vi.fn<typeof import('../sync').fetchEvents>(),
  startPolling: vi.fn<typeof import('../sync').startPolling>(),
}));

vi.mock('../sync', () => ({fetchEvents, startPolling}));

const SHARE_ID = newId();

function thread(id = newId()): Thread {
  return {
    id,
    anchor: {shareId: SHARE_ID, filePath: 'a.txt', side: 'additions', line: 1},
    actorId: 'alice',
    actor: {name: 'Alice', image: null},
    resolved: false,
    createdAt: new Date().toISOString(),
  };
}

function opened(seq: number, subject = thread()): ShareEvent {
  return {
    id: newId(),
    shareId: SHARE_ID,
    seq,
    type: 'thread.opened',
    subjectId: subject.id,
    actorId: subject.actorId,
    createdAt: subject.createdAt,
    thread: subject,
  };
}

function openChange(threadId: string): OptimisticChange {
  return {
    actorId: 'alice',
    actor: {name: 'Alice', image: null},
    createdAt: new Date().toISOString(),
    payload: {
      $type: 'thread.opened',
      threadId,
      anchor: {
        shareId: SHARE_ID,
        filePath: 'a.txt',
        side: 'additions',
        line: 1,
      },
    },
  };
}

function ThreadCount() {
  const {threads, seq} = use(ShareStateContext);
  return (
    <output>
      {threads.size} threads at seq {seq}
    </output>
  );
}

let actions: React.ContextType<typeof ShareActionsContext>;
function CaptureActions() {
  actions = use(ShareActionsContext);
  return null;
}

function renderProvider(
  snapshot: ShareSnapshot = {seq: 0, threads: [], comments: []},
) {
  return render(
    <ShareEventsProvider shareId={SHARE_ID} snapshot={snapshot}>
      <CaptureActions />
      <ThreadCount />
    </ShareEventsProvider>,
  );
}

function polledFn() {
  return startPolling.mock.calls[0]![0];
}

beforeEach(() => {
  fetchEvents.mockResolvedValue([]);
});

describe('ShareEventsProvider', () => {
  it('starts from the snapshot', () => {
    renderProvider({seq: 2, threads: [thread(), thread()], comments: []});

    expect(screen.getByRole('status')).toHaveTextContent('2 threads at seq 2');
  });

  it('polls for events after its seq', async () => {
    renderProvider({seq: 1, threads: [thread()], comments: []});
    fetchEvents.mockResolvedValueOnce([opened(2), opened(3)]);

    await act(() => polledFn()());

    expect(fetchEvents).toHaveBeenLastCalledWith(SHARE_ID, 1);
    expect(screen.getByRole('status')).toHaveTextContent('3 threads at seq 3');

    await act(() => polledFn()());

    expect(fetchEvents).toHaveBeenLastCalledWith(SHARE_ID, 3);
  });

  it('shows a change while it is saved, then the stored one', async () => {
    renderProvider();
    const stored = thread();
    let save!: () => void;
    fetchEvents.mockResolvedValueOnce([opened(1, stored)]);

    let saved!: Promise<boolean>;
    act(() => {
      saved = actions.optimistic(
        [openChange(stored.id)],
        () =>
          new Promise<void>((resolve) => {
            save = resolve;
          }),
      );
    });

    expect(screen.getByRole('status')).toHaveTextContent('1 threads at seq 0');

    await act(async () => {
      save();
      await saved;
    });

    await expect(saved).resolves.toBe(true);
    expect(fetchEvents).toHaveBeenCalledExactlyOnceWith(SHARE_ID, 0);
    expect(screen.getByRole('status')).toHaveTextContent('1 threads at seq 1');
  });

  it('drops a change that fails to save', async () => {
    renderProvider();

    let saved!: Promise<boolean>;
    await act(async () => {
      saved = actions.optimistic([openChange(newId())], () =>
        Promise.reject(new Error('Refused')),
      );
      await saved;
    });

    await expect(saved).resolves.toBe(false);
    expect(fetchEvents).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('0 threads at seq 0');
  });

  it('stops polling on unmount', () => {
    const stopPolling = vi.fn();
    startPolling.mockReturnValue(stopPolling);
    const {unmount} = renderProvider();

    unmount();

    expect(stopPolling).toHaveBeenCalledOnce();
  });
});
