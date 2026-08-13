'use client';

import './_diff-list.css';

import {Virtualizer} from '@pierre/diffs/react';

import type {PreloadedDiffItem} from '@/lib/diffs/preload';

import {authClient} from '@/lib/auth-client';

import {DiffItem} from './_diff-item';

export function DiffList({items}: {items: PreloadedDiffItem[]}) {
  // Prefetch
  authClient.useSession();

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
