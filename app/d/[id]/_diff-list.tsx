'use client';

import type {FileDiffMetadata} from '@pierre/diffs';

import {useVirtualizer, Virtualizer} from '@pierre/diffs/react';

import type {LineAnnotation} from '@/lib/diffs/annotation';

import {useHashChange} from '@/lib/hooks/use-hash-change';
import {assertPresent, isPresent} from '@/lib/utils/is-present';
import {getHash} from '@/lib/utils/set-hash';

import {DiffItem} from './_diff-item';

interface DiffListItem {
  readonly id: string;
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
  readonly annotations?: LineAnnotation[];
}

interface DiffListProps {
  readonly items: readonly DiffListItem[];
}

export function DiffList({items}: DiffListProps) {
  return (
    <Virtualizer className="h-full overflow-auto">
      <DiffListContent items={items} />
    </Virtualizer>
  );
}

interface DiffListContentProps {
  readonly items: readonly DiffListItem[];
}

function DiffListContent({items}: DiffListContentProps) {
  const virtualizer = useVirtualizer();

  useHashChange((event) => {
    assertPresent(virtualizer, 'Missing virtualizer');
    const url = new URL(event.newURL);
    const hash = getHash(url);
    if (!isPresent(hash)) {
      return;
    }
    const element = document.getElementById(hash);
    if (!isPresent(element)) {
      return;
    }
    virtualizer.scrollTo({
      top: virtualizer.getOffsetInScrollContainer(element),
    });
  });

  return (
    <>
      {items.map(({id, fileDiff, prerenderedHTML, annotations}) => (
        <section key={id} id={id}>
          <DiffItem
            fileDiff={fileDiff}
            prerenderedHTML={prerenderedHTML}
            initialLineAnnotations={annotations}
          />
        </section>
      ))}
    </>
  );
}
