// @vitest-environment jsdom

import {act, renderHook} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {newId} from '#/utils/new-id';

import {threadError, type ThreadError} from '../errors';
import {ThreadsProvider, useShareActions, useShareState} from '../provider';
import type {ShareSnapshot, Thread} from '../schemas';
import type {OptimisticChange} from '../state';

const {fetchSnapshot, startPolling} = vi.hoisted(() => ({
  fetchSnapshot: vi.fn<typeof import('../sync').fetchSnapshot>(),
  startPolling: vi.fn<typeof import('../sync').startPolling>(),
}));

vi.mock('../sync', () => ({fetchSnapshot, startPolling}));

const SHARE_ID = newId();
const FILE_ID = newId();

function thread(id = newId()): Thread {
  return {
    id,
    anchor: {fileId: FILE_ID, side: 'additions', line: 1},
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
        fileId: FILE_ID,
        side: 'additions',
        line: 1,
      },
    },
  };
}

function renderProvider(initial = snapshot(0)) {
  return renderHook(
    () => {
      const {threads, revision} = useShareState();
      return {threadCount: threads.size, revision, ...useShareActions()};
    },
    {
      wrapper: ({children}) => (
        <ThreadsProvider shareId={SHARE_ID} snapshot={initial}>
          {children}
        </ThreadsProvider>
      ),
    },
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
    const {result} = renderProvider(snapshot(2, [thread(), thread()]));

    expect(result.current).toMatchObject({threadCount: 2, revision: 2});
  });

  it('polls for changes after its revision', async () => {
    const {result} = renderProvider(snapshot(1, [thread()]));
    fetchSnapshot.mockResolvedValueOnce(
      snapshot(3, [thread(), thread(), thread()]),
    );

    await act(() => polledFn()());

    expect(fetchSnapshot).toHaveBeenLastCalledWith(SHARE_ID, 1);
    expect(result.current).toMatchObject({threadCount: 3, revision: 3});

    await act(() => polledFn()());

    expect(fetchSnapshot).toHaveBeenLastCalledWith(SHARE_ID, 3);
    expect(result.current).toMatchObject({threadCount: 3, revision: 3});
  });

  it('shows a change while it is saved, then the stored one', async () => {
    const {result} = renderProvider();
    const stored = thread();
    let save!: () => void;
    fetchSnapshot.mockResolvedValueOnce(snapshot(1, [stored]));

    let saved!: Promise<ThreadError | undefined>;
    act(() => {
      saved = result.current.optimistic(
        [openChange(stored.id)],
        () =>
          new Promise<undefined>((resolve) => {
            save = () => resolve(undefined);
          }),
      );
    });

    expect(result.current).toMatchObject({threadCount: 1, revision: 0});

    await act(async () => {
      save();
      await saved;
    });

    await expect(saved).resolves.toBeUndefined();
    expect(fetchSnapshot).toHaveBeenCalledExactlyOnceWith(SHARE_ID, 0);
    expect(result.current).toMatchObject({threadCount: 1, revision: 1});
  });

  it('drops a refused change and returns its error', async () => {
    const {result} = renderProvider();
    const refused = threadError('THREAD_ALREADY_EXISTS', 'Refused');

    let saved!: Promise<ThreadError | undefined>;
    await act(async () => {
      saved = result.current.optimistic([openChange(newId())], () =>
        Promise.resolve(refused),
      );
      await saved;
    });

    await expect(saved).resolves.toBe(refused);
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({threadCount: 0, revision: 0});
  });

  it('drops a change that fails to save', async () => {
    const {result} = renderProvider();

    let saved!: Promise<ThreadError | undefined>;
    await act(async () => {
      saved = result.current.optimistic([openChange(newId())], () =>
        Promise.reject(new Error('Offline')),
      );
      await saved;
    });

    await expect(saved).resolves.toMatchObject({reason: 'SAVE_FAILED'});
    expect(fetchSnapshot).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({threadCount: 0, revision: 0});
  });

  it('stops polling on unmount', () => {
    const stopPolling = vi.fn();
    startPolling.mockReturnValue(stopPolling);
    const {unmount} = renderProvider();

    unmount();

    expect(stopPolling).toHaveBeenCalledOnce();
  });
});
