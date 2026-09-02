'use client';

import {useSyncExternalStore, type ReactNode} from 'react';

interface ClientGateProps {
  readonly children: () => ReactNode;
  readonly fallback: ReactNode;
}

export function ClientGate({children, fallback}: ClientGateProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return isClient ? children() : fallback;
}
