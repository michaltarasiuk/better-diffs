'use client';

import type {FileDiffMetadata} from '@pierre/diffs';

import {Virtualizer} from '@pierre/diffs/react';

import {DiffItem} from './_diff-item';

interface DiffListProps {
  readonly items: readonly {
    readonly id: string;
    readonly fileDiff: FileDiffMetadata;
    readonly prerenderedHTML: string;
  }[];
}

export function DiffList({items}: DiffListProps) {
  return (
    <Virtualizer className="h-full overflow-auto">
      {items.map(({id, fileDiff, prerenderedHTML}) => (
        <DiffItem
          key={id}
          fileDiff={fileDiff}
          prerenderedHTML={prerenderedHTML}
        />
      ))}
    </Virtualizer>
  );
}
