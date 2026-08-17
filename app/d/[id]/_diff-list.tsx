'use client';

import './_diff-list.css';

import {Virtualizer} from '@pierre/diffs/react';

import type {PreloadedDiffItem} from '@/lib/diffs/preload';

import {DiffItem} from './_diff-item';

export function DiffList({items}: {items: PreloadedDiffItem[]}) {
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
