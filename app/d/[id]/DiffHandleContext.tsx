'use client';

import {createContext, useRef} from 'react';

import {DiffProvider} from '@/diffs/DiffProvider';

import type {AnnotationMetadata} from '@/diffs/options';
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
