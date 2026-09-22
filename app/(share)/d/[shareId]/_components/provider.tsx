'use client';

import {createContext, useRef} from 'react';
import type {CodeViewHandle} from '@pierre/diffs/react';

import type {AnnotationMetadata} from '@/diffs/annotations';
import {DiffProvider} from '@/diffs/provider';

export const HandleContext = createContext<
  React.RefObject<CodeViewHandle<AnnotationMetadata, null> | null>
>({current: null});

export function CodeViewProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const handleRef = useRef<CodeViewHandle<AnnotationMetadata, null>>(null);

  return (
    <DiffProvider>
      <HandleContext value={handleRef}>{children}</HandleContext>
    </DiffProvider>
  );
}
