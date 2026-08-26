'use client';

import {DEFAULT_THEMES} from '@pierre/diffs';
import {WorkerPoolContextProvider} from '@pierre/diffs/react';

interface DiffWorkerPoolProviderProps {
  readonly children: React.ReactNode;
}

export function DiffWorkerPoolProvider({
  children,
}: DiffWorkerPoolProviderProps) {
  return (
    <WorkerPoolContextProvider
      poolOptions={{
        poolSize: 4,
        workerFactory: () =>
          new Worker(
            new URL('@pierre/diffs/worker/worker.js', import.meta.url),
            {type: 'module'},
          ),
      }}
      highlighterOptions={{
        theme: DEFAULT_THEMES,
      }}
    >
      {children}
    </WorkerPoolContextProvider>
  );
}
