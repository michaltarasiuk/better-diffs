'use client';

import {createContext, useRef, type ReactNode, type RefObject} from 'react';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

type DiffViewer = CodeViewHandle<AnnotationMetadata>;

export const DiffViewerContext =
  createContext<RefObject<DiffViewer | null> | null>(null);

export function DiffViewerProvider({children}: {children: ReactNode}) {
  const viewerRef = useRef<DiffViewer>(null);

  return <DiffViewerContext value={viewerRef}>{children}</DiffViewerContext>;
}
