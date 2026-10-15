'use client';

import type {CodeViewHandle} from '@pierre/diffs/react';
import {createContext, use, useRef} from 'react';

import type {AnnotationMetadata} from '#/diffs/annotations';
import {DiffWorkerPoolProvider} from '#/diffs/provider';
import {isDefined} from '#/utils/is-defined';

type Handle = CodeViewHandle<AnnotationMetadata, undefined>;

type CodeViewRef = React.RefObject<Handle | null>;

const CodeViewRefContext = createContext<CodeViewRef | null>(null);

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

export function useCodeViewRef() {
  const codeViewRef = use(CodeViewRefContext);
  if (!isDefined(codeViewRef)) {
    throw new Error('useCodeViewRef must be used within CodeViewProvider');
  }
  return codeViewRef;
}
