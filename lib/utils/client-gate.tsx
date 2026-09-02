'use client';

import {useSyncExternalStore} from 'react';

interface ClientGateProps {
  readonly children: React.ReactNode;
  readonly fallback: React.ReactNode;
}

export function ClientGate({children, fallback}: ClientGateProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return isClient ? children : fallback;
}
