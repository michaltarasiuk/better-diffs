'use client';

import type {CodeViewHandle} from '@pierre/diffs/react';
import {createContext, useRef} from 'react';

import type {AnnotationMetadata} from '@/diffs/annotations';
import {DiffWorkerPoolProvider} from '@/diffs/provider';

type Handle = CodeViewHandle<AnnotationMetadata, null>;

type CodeViewRef = React.RefObject<Handle | null>;

export const CodeViewRefContext = createContext<CodeViewRef>(null as never);

export function CodeViewProvider({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const codeViewRef = useRef<Handle>(null);

  return (
    <DiffWorkerPoolProvider>
      <CodeViewRefContext value={codeViewRef}>{children}</CodeViewRefContext>
    </DiffWorkerPoolProvider>
  );
}
