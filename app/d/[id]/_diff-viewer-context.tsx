'use client';

import {createContext, useRef} from 'react';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

type DiffViewer = CodeViewHandle<AnnotationMetadata>;
type DiffViewerRef = React.RefObject<DiffViewer | null>;

export const DiffViewerContext = createContext<DiffViewerRef | null>(null);

interface DiffViewerProviderProps {
  readonly children: React.ReactNode;
}

export function DiffViewerProvider({children}: DiffViewerProviderProps) {
  const viewerRef = useRef<DiffViewer | null>(null);

  return <DiffViewerContext value={viewerRef}>{children}</DiffViewerContext>;
}
