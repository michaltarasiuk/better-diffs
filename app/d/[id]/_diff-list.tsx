'use client';

import './_diff-list.css';

import {Button} from '@heroui/react';
import {FileDiff, Virtualizer} from '@pierre/diffs/react';
import {PlusIcon} from 'lucide-react';

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
          prerenderedHTML={prerenderedHTML}
          options={{
            ...STATIC_DIFF_VIEWER_OPTIONS,
            enableGutterUtility: true,
            enableLineSelection: true,
          }}
          renderGutterUtility={() => <GutterUtility />}
        />
      ))}
    </Virtualizer>
  );
}

function GutterUtility() {
  return (
    <Button
      id="gutter-utility"
      aria-label="Add comment"
      className="me-[calc(-1lh+1ch)] h-lh w-[1lh]"
      isIconOnly
    >
      <PlusIcon aria-hidden className="size-4" />
    </Button>
  );
}
