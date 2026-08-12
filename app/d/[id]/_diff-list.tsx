'use client';

import './_diff-list.css';

import {FileDiff, Virtualizer} from '@pierre/diffs/react';

import type {PreloadedDiffItem} from '@/lib/diffs';

import {STATIC_DIFF_VIEWER_OPTIONS} from '@/lib/diffs';

const VIEWER_STYLE = {
  height: '100dvh',
  overflow: 'auto',
} as const;

export function DiffList({items}: {items: PreloadedDiffItem[]}) {
  return (
    <Virtualizer style={VIEWER_STYLE}>
      {items.map(({id, fileDiff, prerenderedHTML}) => (
        <FileDiff
          key={id}
          fileDiff={fileDiff}
          options={STATIC_DIFF_VIEWER_OPTIONS}
          prerenderedHTML={prerenderedHTML}
        />
      ))}
    </Virtualizer>
  );
}
