'use client';

import {useRef} from 'react';

import {DiffProvider} from '@/diffs/DiffProvider';

import {HandleContext} from './handleContext';

import type {AnnotationMetadata} from '@/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

export function CodeViewProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const handleRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);

  return (
    <DiffProvider>
      <HandleContext value={handleRef}>{children}</HandleContext>
    </DiffProvider>
  );
}
