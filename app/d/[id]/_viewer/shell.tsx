'use client';

import {Spinner} from '@heroui/react';
import {useSyncExternalStore} from 'react';

interface DiffFilesShellProps {
  readonly children: React.ReactNode;
}

export function DiffFilesShell({children}: DiffFilesShellProps) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!isClient) {
    return diffFilesSpinner;
  }

  return children;
}

const diffFilesSpinner = (
  <div className="flex h-full items-center justify-center">
    <Spinner aria-label="Loading diff" />
  </div>
);
