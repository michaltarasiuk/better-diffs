'use client';

import type {FileDiffMetadata} from '@pierre/diffs';

import {
  FileTree,
  type FileTreePreloadedData,
  useFileTree,
} from '@pierre/trees/react';

import {getDiffTreeOptions} from '@/lib/diffs/tree';

interface DiffTreeProps {
  files: FileDiffMetadata[];
  preloadedData: FileTreePreloadedData;
}

export function DiffTree({files, preloadedData}: DiffTreeProps) {
  const {model} = useFileTree(getDiffTreeOptions(files));

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
