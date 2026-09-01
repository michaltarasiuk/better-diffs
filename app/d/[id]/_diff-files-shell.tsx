'use client';

import {Spinner} from '@heroui/react';
import {useSyncExternalStore} from 'react';

// Pierre FileDiff emits declarative shadow DOM during SSR but attaches it
// imperatively on the client. Defer rendering children until after hydration.
export function DiffFilesShell({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return diffFilesSpinner;
  }

  return children;
}

export const diffFilesSpinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner aria-label="Loading diff" />
  </div>
);
