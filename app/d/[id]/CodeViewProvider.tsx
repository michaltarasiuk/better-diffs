'use client';

import {useRef} from 'react';

import {DiffProvider} from '@/diffs/DiffProvider';

import {CodeViewContext} from './codeViewContext';

import type {AnnotationMetadata} from '@/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

interface CodeViewProviderProps {
  readonly children: React.ReactNode;
}

export function CodeViewProvider({children}: CodeViewProviderProps) {
  const handleRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);

  return (
    <DiffProvider>
      <CodeViewContext value={handleRef}>{children}</CodeViewContext>
    </DiffProvider>
  );
}
