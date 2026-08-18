'use client';

import {Virtualizer} from '@pierre/diffs/react';

import type {PreloadedDiffItem} from '@/lib/diffs/preload';

import {DiffItem} from './_diff-item';

interface DiffListProps {
  readonly items: readonly PreloadedDiffItem[];
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
