'use client';

import {createContext, useRef} from 'react';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

type DiffViewer = CodeViewHandle<AnnotationMetadata>;

export const DiffViewerContext = createContext<
  React.RefObject<DiffViewer | null>
>({current: null});

export function DiffViewerProvider({children}: {children: React.ReactNode}) {
  const viewerRef = useRef<DiffViewer>(null);

  return <DiffViewerContext value={viewerRef}>{children}</DiffViewerContext>;
}
