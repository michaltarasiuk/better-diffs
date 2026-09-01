'use client';

import '@/lib/diffs/diffs.module.css';

import {CodeView} from '@pierre/diffs/react';
import {use, useState} from 'react';

import {CODE_VIEW_OPTIONS} from '@/lib/diffs/options';
import {isDefined} from '@/lib/utils/defined';

import {Annotation, GutterUtility, type DiffAnnotation} from './_annotations';
import {DiffViewerContext} from './_diff-viewer-context';

import type {AnnotationMetadata} from '@/lib/diffs/options';
import type {CodeViewLineSelection, FileDiffMetadata} from '@pierre/diffs';
import type {CodeViewDiffItem} from '@pierre/diffs/react';

type DiffItem = CodeViewDiffItem<AnnotationMetadata>;

const ANNOTATION_SIDE_ORDER = {deletions: 0, additions: 1} as const;
const CODE_VIEW_STYLE = {height: '100%', overflow: 'auto'} as const;

interface DiffCodeViewFile {
  readonly id: string;
  readonly metadata: FileDiffMetadata;
}

interface DiffCodeViewProps {
  readonly files: readonly DiffCodeViewFile[];
}

export function DiffCodeView({files}: DiffCodeViewProps) {
  const viewerRef = use(DiffViewerContext);

  const [items, setItems] = useState<readonly DiffItem[]>(() =>
    files.map((f) => ({
      id: f.id,
      type: 'diff',
      fileDiff: f.metadata,
      annotations: [],
      version: 0,
    })),
  );
  const [selectedLines, setSelectedLines] =
    useState<CodeViewLineSelection | null>(null);

  function updateAnnotations(
    fileId: string,
    update: (a: readonly DiffAnnotation[]) => DiffAnnotation[],
  ) {
    setItems((i) =>
      i.map((di) =>
        di.id === fileId
          ? {
              ...di,
              annotations: update(di.annotations ?? []),
              version: (di.version ?? 0) + 1,
            }
          : di,
      ),
    );
  }

  return (
    <CodeView
      ref={viewerRef}
      items={items}
      selectedLines={selectedLines}
      options={CODE_VIEW_OPTIONS}
      style={CODE_VIEW_STYLE}
      onSelectedLinesChange={setSelectedLines}
      renderGutterUtility={(getHoveredLine, di) => (
        <GutterUtility
          onAddAnnotation={() => {
            const line = getHoveredLine();
            if (!isDefined(line) || !isDiffLine(line)) {
              console.error('No hovered line');
              return;
            }

            const {side, lineNumber} = line;
            updateAnnotations(di.id, (a) =>
              sortAnnotations([
                ...a,
                {side, lineNumber, metadata: {type: 'form'}},
              ]),
            );
          }}
        />
      )}
      renderAnnotation={(annotation, di) => {
        if (!isDiffLine(annotation)) {
          return null;
        }

        return (
          <Annotation
            annotation={annotation}
            fileId={di.id}
            onDismiss={() => {
              updateAnnotations(di.id, (a) =>
                a.filter((an) => an !== annotation),
              );
            }}
          />
        );
      }}
    />
  );
}

function isDiffLine<T extends {lineNumber: number}>(
  line: T,
): line is T & {side: DiffAnnotation['side']} {
  return 'side' in line;
}

function sortAnnotations(annotations: readonly DiffAnnotation[]) {
  return annotations.toSorted(
    (a, b) =>
      a.lineNumber - b.lineNumber ||
      ANNOTATION_SIDE_ORDER[a.side] - ANNOTATION_SIDE_ORDER[b.side],
  );
}
