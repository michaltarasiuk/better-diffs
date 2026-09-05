'use client';

import {useSyncExternalStore} from 'react';

interface ClientOnlyProps {
  readonly children: React.ReactNode;
  readonly fallback: React.ReactNode;
}

export function ClientOnly({children, fallback}: ClientOnlyProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return isClient ? children : fallback;
}
