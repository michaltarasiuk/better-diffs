'use client';

import {useRef} from 'react';
import type {CodeViewHandle} from '@pierre/diffs/react';

import {DiffProvider} from '@/diffs/DiffProvider';
import type {AnnotationMetadata} from '@/diffs/options';
import {HandleContext} from './handleContext';

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
