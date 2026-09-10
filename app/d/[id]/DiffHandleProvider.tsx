'use client';

import {useRef} from 'react';

import {DiffProvider} from '@/diffs/DiffProvider';

import {DiffHandleContext} from './diffHandleContext';

import type {AnnotationMetadata} from '@/diffs/options';
import type {CodeViewHandle} from '@pierre/diffs/react';

interface DiffHandleProviderProps {
  readonly children: React.ReactNode;
}

export function DiffHandleProvider({children}: DiffHandleProviderProps) {
  const handleRef = useRef<CodeViewHandle<AnnotationMetadata>>(null);

  return (
    <DiffProvider>
      <DiffHandleContext value={handleRef}>{children}</DiffHandleContext>
    </DiffProvider>
  );
}
