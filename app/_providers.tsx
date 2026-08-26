'use client';

import {NuqsAdapter} from 'nuqs/adapters/next/app';

import {DiffWorkerPoolProvider} from '@/lib/diffs/worker-pool';

interface ProvidersProps {
  readonly children: React.ReactNode;
}

export function Providers({children}: ProvidersProps) {
  return (
    <DiffWorkerPoolProvider>
      <NuqsAdapter>{children}</NuqsAdapter>
    </DiffWorkerPoolProvider>
  );
}
