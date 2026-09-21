'use client';

import {useRef} from 'react';
import type {CodeViewHandle} from '@pierre/diffs/react';

import type {AnnotationMetadata} from '@/diffs/annotations';
import {DiffProvider} from '@/diffs/diff-provider';
import {HandleContext} from '../_lib/handle-context';

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
