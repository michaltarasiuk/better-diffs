'use client';

import {DEFAULT_THEMES} from '@pierre/diffs';
import {
  type WorkerInitializationRenderOptions,
  WorkerPoolContextProvider,
} from '@pierre/diffs/react';
import type {WorkerPoolOptions} from '@pierre/diffs/worker';

const WORKER_POOL_OPTIONS = {
  poolSize: 4,
  workerFactory() {
    return new Worker(
      new URL('@pierre/diffs/worker/worker-portable.js', import.meta.url),
      {type: 'module'},
    );
  },
} satisfies WorkerPoolOptions;

const WORKER_HIGHLIGHTER_OPTIONS = {
  theme: DEFAULT_THEMES,
} satisfies WorkerInitializationRenderOptions;

interface DiffWorkerPoolProviderProps {
  readonly children: React.ReactNode;
}

export function DiffWorkerPoolProvider({
  children,
}: DiffWorkerPoolProviderProps) {
  return (
    <WorkerPoolContextProvider
      poolOptions={WORKER_POOL_OPTIONS}
      highlighterOptions={WORKER_HIGHLIGHTER_OPTIONS}
    >
      {children}
    </WorkerPoolContextProvider>
  );
}
