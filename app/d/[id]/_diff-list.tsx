'use client';

import {useVirtualizer, Virtualizer} from '@pierre/diffs/react';
import {useQueryState} from 'nuqs';

import {
  toFormAnnotation,
  type FormLocation,
  type ThreadAnnotation,
} from '@/lib/diffs/annotation';
import {useHashChange} from '@/lib/hooks/use-hash-change';
import {getHash} from '@/lib/utils/hash';
import {assertDefined, isDefined} from '@/lib/utils/is-defined';

import {DiffItem} from './_diff-item';
import {parseAsFormLocations} from './_search-params.parsers';

import type {FileDiffMetadata} from '@pierre/diffs';

interface DiffListItem {
  readonly id: string;
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
  readonly threadAnnotations: readonly ThreadAnnotation[];
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
  const {getFormLocations, addFormLocation, removeFormLocation} =
    useFormLocations();

  useHashChange((e) => {
    assertDefined(virtualizer, 'Missing virtualizer');
    const hash = getHash(new URL(e.newURL));
    if (!isDefined(hash)) {
      return;
    }
    const el = document.getElementById(hash);
    if (!isDefined(el)) {
      return;
    }
    virtualizer.scrollTo({
      top: virtualizer.getOffsetInScrollContainer(el),
    });
  });

  return (
    <>
      {items.map((i) => {
        const formLocations = getFormLocations(i.fileDiff.name);
        return (
          <section key={i.id} id={i.id}>
            <DiffItem
              fileDiff={i.fileDiff}
              prerenderedHTML={i.prerenderedHTML}
              lineAnnotations={[
                ...i.threadAnnotations,
                ...formLocations.map(toFormAnnotation),
              ]}
              onAddFormAnnotation={(l) =>
                addFormLocation({
                  file: i.fileDiff.name,
                  lineNumber: l.lineNumber,
                  side: l.side,
                })
              }
              onRemoveFormAnnotation={(l) =>
                removeFormLocation({
                  file: i.fileDiff.name,
                  lineNumber: l.lineNumber,
                  side: l.side,
                })
              }
            />
          </section>
        );
      })}
    </>
  );
}

function useFormLocations() {
  const [formLocations, setFormLocations] = useQueryState(
    'formLocations',
    parseAsFormLocations,
  );

  const formLocationsByFile = Map.groupBy(formLocations, (a) => a.file);

  function getFormLocations(f: string) {
    return formLocationsByFile.get(f) ?? [];
  }

  function addFormLocation(l: FormLocation) {
    setFormLocations((fl) => [...fl, l]);
  }

  function removeFormLocation(l: FormLocation) {
    setFormLocations((fl) =>
      fl.filter(
        (a) =>
          !(
            a.file === l.file &&
            a.lineNumber === l.lineNumber &&
            a.side === l.side
          ),
      ),
    );
  }

  return {getFormLocations, addFormLocation, removeFormLocation};
}
