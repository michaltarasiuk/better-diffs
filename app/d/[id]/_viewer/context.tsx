'use client';

import {createContext, useRef} from 'react';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

export const DiffViewerContext = createContext<
  React.RefObject<CodeViewHandle<AnnotationMetadata> | null>
>({current: null});

export function DiffViewerProvider({children}: {children: React.ReactNode}) {
  const viewerRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);

  return <DiffViewerContext value={viewerRef}>{children}</DiffViewerContext>;
}
