'use client';

import {NuqsAdapter} from 'nuqs/adapters/next/app';

import {usePageShow} from '@/lib/hooks/use-page-show';

interface ProvidersProps {
  readonly children: React.ReactNode;
}

export function Providers({children}: ProvidersProps) {
  usePageShow(function bypassBfcache(e) {
    if (e.persisted) {
      window.location.reload();
    }
  });

  return <NuqsAdapter>{children}</NuqsAdapter>;
}
