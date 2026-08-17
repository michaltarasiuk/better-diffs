'use client';

import {
  FileTree,
  type FileTreePreloadedData,
  useFileTree,
} from '@pierre/trees/react';

import {type DiffTreeHandoff, getDiffTreeOptions} from '@/lib/diffs/tree';

interface DiffTreeProps {
  readonly handoff: DiffTreeHandoff;
  readonly preloadedData: FileTreePreloadedData;
}

export function DiffTree({handoff, preloadedData}: DiffTreeProps) {
  const {model} = useFileTree(getDiffTreeOptions(handoff));

  return (
    <FileTree
      model={model}
      preloadedData={preloadedData}
      className="h-full"
      style={
        {
          '--trees-gap-override': 'var(--trees-item-row-gap)',
        } as React.CSSProperties
      }
    />
  );
}
