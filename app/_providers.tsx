'use client';

import {NuqsAdapter} from 'nuqs/adapters/next/app';

interface ProvidersProps {
  readonly children: React.ReactNode;
}

export function Providers({children}: ProvidersProps) {
  return <NuqsAdapter>{children}</NuqsAdapter>;
}
