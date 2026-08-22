'use client';

import {useVirtualizer, Virtualizer} from '@pierre/diffs/react';
import {useQueryState} from 'nuqs';

import {
  parseAsFormAnnotations,
  toFormAnnotation,
  type FormAnnotationLocation,
} from '@/lib/diffs/annotation';
import {useHashChange} from '@/lib/hooks/use-hash-change';
import {assertDefined, isDefined} from '@/lib/utils/is-defined';
import {getHash} from '@/lib/utils/set-hash';

import {DiffItem} from './_diff-item';

import type {FileDiffMetadata} from '@pierre/diffs';

interface DiffListItem {
  readonly id: string;
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
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
  const {getFormAnnotations, addFormAnnotation, removeFormAnnotation} =
    useFormAnnotations();

  useHashChange((e) => {
    assertDefined(virtualizer, 'Missing virtualizer');
    const url = new URL(e.newURL);
    const hash = getHash(url);
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
        const formAnnotations = getFormAnnotations(i.fileDiff.name);
        return (
          <section key={i.id} id={i.id}>
            <DiffItem
              fileDiff={i.fileDiff}
              prerenderedHTML={i.prerenderedHTML}
              lineAnnotations={formAnnotations.map(toFormAnnotation)}
              onAddFormAnnotation={(l) =>
                addFormAnnotation({
                  file: i.fileDiff.name,
                  lineNumber: l.lineNumber,
                  side: l.side,
                })
              }
              onRemoveFormAnnotation={(l) =>
                removeFormAnnotation({
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

function useFormAnnotations() {
  const [formAnnotations, setFormAnnotations] = useQueryState(
    'formAnnotations',
    parseAsFormAnnotations,
  );

  const formAnnotationsByFile = Map.groupBy(formAnnotations, (a) => a.file);

  function getFormAnnotations(f: string) {
    return formAnnotationsByFile.get(f) ?? [];
  }

  function addFormAnnotation(l: FormAnnotationLocation) {
    setFormAnnotations((fa) => [...fa, l]);
  }

  function removeFormAnnotation(l: FormAnnotationLocation) {
    setFormAnnotations((fa) =>
      fa.filter(
        (a) =>
          !(
            a.file === l.file &&
            a.lineNumber === l.lineNumber &&
            a.side === l.side
          ),
      ),
    );
  }

  return {getFormAnnotations, addFormAnnotation, removeFormAnnotation};
}
