'use client';

import {createContext, useRef} from 'react';

import {DiffWorkerPoolProvider} from '@/lib/diffs/worker-pool';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

export const DiffViewerContext = createContext<
  React.RefObject<CodeViewHandle<AnnotationMetadata> | null>
>({current: null});

export function DiffViewerProvider({children}: {children: React.ReactNode}) {
  const viewerRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);

  return (
    <DiffWorkerPoolProvider>
      <DiffViewerContext value={viewerRef}>{children}</DiffViewerContext>
    </DiffWorkerPoolProvider>
  );
}
