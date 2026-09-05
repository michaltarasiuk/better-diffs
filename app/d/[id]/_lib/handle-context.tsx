'use client';

import {createContext, useRef} from 'react';

import {DiffProvider} from '@/lib/diffs/worker-pool';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

export const DiffHandleContext = createContext<
  React.RefObject<CodeViewHandle<AnnotationMetadata> | null>
>({current: null});

export function DiffHandleProvider({children}: {children: React.ReactNode}) {
  const handleRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);

  return (
    <DiffProvider>
      <DiffHandleContext value={handleRef}>{children}</DiffHandleContext>
    </DiffProvider>
  );
}
