'use client';

import {Spinner} from '@heroui/react';
import {useSyncExternalStore} from 'react';

interface DiffFilesShellProps {
  readonly children: React.ReactNode;
}

export function DiffFilesShell({children}: DiffFilesShellProps) {
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
