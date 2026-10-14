// @vitest-environment jsdom

import {act, render, screen} from '@testing-library/react';
import {use} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {newId} from '@/utils/new-id';

import {threadError, type ThreadError} from '../errors';
import {
  ShareActionsContext,
  ShareStateContext,
  ThreadsProvider,
} from '../provider';
import type {ShareSnapshot, Thread} from '../schemas';
import type {OptimisticChange} from '../state';

const {fetchSnapshot, startPolling} = vi.hoisted(() => ({
  fetchSnapshot: vi.fn<typeof import('../sync').fetchSnapshot>(),
  startPolling: vi.fn<typeof import('../sync').startPolling>(),
}));

vi.mock('../sync', () => ({fetchSnapshot, startPolling}));

const SHARE_ID = newId();

function thread(id = newId()): Thread {
  return {
    id,
    anchor: {filePath: 'a.txt', side: 'additions', line: 1},
    actorId: 'alice',
    actor: {name: 'Alice', image: null},
    createdAt: new Date().toISOString(),
  };
}

function snapshot(revision: number, threads: Thread[] = []): ShareSnapshot {
  return {revision, threads, comments: []};
}

function openChange(threadId: string): OptimisticChange {
  return {
    actorId: 'alice',
    actor: {name: 'Alice', image: null},
    createdAt: new Date().toISOString(),
    change: {
      type: 'openThread',
      threadId,
      anchor: {
        filePath: 'a.txt',
        side: 'additions',
        line: 1,
      },
    },
  };
}

function ThreadCount() {
  const {threads, revision} = use(ShareStateContext);
  return (
    <output>
      {threads.size} threads at revision {revision}
    </output>
  );
}

let actions: React.ContextType<typeof ShareActionsContext>;
function CaptureActions() {
  actions = use(ShareActionsContext);
  return null;
}

function renderProvider(initial = snapshot(0)) {
  return render(
    <ThreadsProvider shareId={SHARE_ID} snapshot={initial}>
      <CaptureActions />
      <ThreadCount />
    </ThreadsProvider>,
  );
}

function polledFn() {
  return startPolling.mock.calls[0]![0];
}

beforeEach(() => {
  fetchSnapshot.mockResolvedValue(null);
});

describe('ThreadsProvider', () => {
  it('starts from the snapshot', () => {
    renderProvider(snapshot(2, [thread(), thread()]));

    expect(screen.getByRole('status')).toHaveTextContent(
      '2 threads at revision 2',
    );
  });

  it('polls for changes after its revision', async () => {
    renderProvider(snapshot(1, [thread()]));
    fetchSnapshot.mockResolvedValueOnce(
      snapshot(3, [thread(), thread(), thread()]),
    );

    await act(() => polledFn()());

    expect(fetchSnapshot).toHaveBeenLastCalledWith(SHARE_ID, 1);
    expect(screen.getByRole('status')).toHaveTextContent(
      '3 threads at revision 3',
    );

    await act(() => polledFn()());

    expect(fetchSnapshot).toHaveBeenLastCalledWith(SHARE_ID, 3);
    expect(screen.getByRole('status')).toHaveTextContent(
      '3 threads at revision 3',
    );
  });

  it('shows a change while it is saved, then the stored one', async () => {
    renderProvider();
    const stored = thread();
    let save!: () => void;
    fetchSnapshot.mockResolvedValueOnce(snapshot(1, [stored]));

    let saved!: Promise<ThreadError | undefined>;
    act(() => {
      saved = actions.optimistic(
        [openChange(stored.id)],
        () =>
          new Promise<undefined>((resolve) => {
            save = () => resolve(undefined);
          }),
      );
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      '1 threads at revision 0',
    );

    await act(async () => {
      save();
      await saved;
    });

    await expect(saved).resolves.toBeUndefined();
    expect(fetchSnapshot).toHaveBeenCalledExactlyOnceWith(SHARE_ID, 0);
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 threads at revision 1',
    );
  });

  it('drops a refused change and returns its error', async () => {
    renderProvider();
    const refused = threadError('THREAD_ALREADY_EXISTS', 'Refused');

    let saved!: Promise<ThreadError | undefined>;
    await act(async () => {
      saved = actions.optimistic([openChange(newId())], () =>
        Promise.resolve(refused),
      );
      await saved;
    });

    await expect(saved).resolves.toBe(refused);
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      '0 threads at revision 0',
    );
  });

  it('drops a change that fails to save', async () => {
    renderProvider();

    let saved!: Promise<ThreadError | undefined>;
    await act(async () => {
      saved = actions.optimistic([openChange(newId())], () =>
        Promise.reject(new Error('Offline')),
      );
      await saved;
    });

    await expect(saved).resolves.toMatchObject({reason: 'SAVE_FAILED'});
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      '0 threads at revision 0',
    );
  });

  it('stops polling on unmount', () => {
    const stopPolling = vi.fn();
    startPolling.mockReturnValue(stopPolling);
    const {unmount} = renderProvider();

    unmount();

    expect(stopPolling).toHaveBeenCalledOnce();
  });
});
