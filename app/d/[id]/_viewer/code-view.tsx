'use client';

import '@/lib/diffs/diffs.css';

import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';
import {use, useState} from 'react';

import {CODE_VIEW_OPTIONS} from '@/lib/diffs/options';
import {isDefined} from '@/lib/utils/defined';

import {Annotation, GutterUtility, type DiffAnnotation} from './annotations';
import {DiffViewerContext} from './context';

import type {
  CodeViewLineSelection,
  FileDiffMetadata,
  GetHoveredLineResult,
} from '@pierre/diffs';

const ANNOTATION_SIDE_ORDER = {deletions: 0, additions: 1} as const;
const CODE_VIEW_STYLE = {height: '100%', overflow: 'auto'} as const;

type DiffLine = GetHoveredLineResult<'diff'>;
type HoveredLine = GetHoveredLineResult<'file'> | DiffLine;

interface FileAnnotations {
  readonly annotations: DiffAnnotation[];
  readonly version: number;
}

interface DiffCodeViewFile {
  readonly id: string;
  readonly metadata: FileDiffMetadata;
}

interface DiffCodeViewProps {
  readonly files: readonly DiffCodeViewFile[];
}

export function DiffCodeView({files}: DiffCodeViewProps) {
  const [annotationsByFile, setAnnotationsByFile] = useState(
    () => new Map() as ReadonlyMap<string, FileAnnotations>,
  );
  const [selectedLines, setSelectedLines] =
    useState<CodeViewLineSelection | null>(null);

  const viewerRef = use(DiffViewerContext);

  function updateAnnotations(
    fileId: string,
    update: (annotations: DiffAnnotation[]) => DiffAnnotation[],
  ) {
    setAnnotationsByFile((annotationsByFile) => {
      const {annotations = [], version = 0} =
        annotationsByFile.get(fileId) ?? {};

      return new Map(annotationsByFile).set(fileId, {
        annotations: update(annotations),
        version: version + 1,
      });
    });
  }

  function addCommentForm(fileId: string, line?: HoveredLine) {
    if (!isDefined(line) || !isDiffLine(line)) {
      return;
    }

    updateAnnotations(fileId, (annotations) =>
      hasCommentForm(annotations, line)
        ? annotations
        : sortAnnotations([
            ...annotations,
            {...line, metadata: {type: 'form'}},
          ]),
    );
  }

  function removeAnnotation(fileId: string, annotation: DiffAnnotation) {
    updateAnnotations(fileId, (annotations) =>
      annotations.toSpliced(annotations.indexOf(annotation), 1),
    );
  }

  return (
    <CodeView
      ref={viewerRef}
      items={files.map((file) => ({
        id: file.id,
        type: 'diff',
        fileDiff: file.metadata,
        ...annotationsByFile.get(file.id),
      }))}
      selectedLines={selectedLines}
      onSelectedLinesChange={setSelectedLines}
      renderGutterUtility={(getHoveredLine, item) => (
        <GutterUtility
          onAddAnnotation={() => addCommentForm(item.id, getHoveredLine())}
        />
      )}
      renderAnnotation={(annotation, item) =>
        isDiffAnnotation(annotation) ? (
          <Annotation
            annotation={annotation}
            fileId={item.id}
            onDismiss={() => removeAnnotation(item.id, annotation)}
          />
        ) : null
      }
      options={CODE_VIEW_OPTIONS}
      style={CODE_VIEW_STYLE}
    />
  );
}

function isDiffLine(line: HoveredLine): line is DiffLine {
  return 'side' in line;
}

function hasCommentForm(
  annotations: readonly DiffAnnotation[],
  line: DiffLine,
) {
  return annotations.some(
    (annotation) =>
      annotation.metadata.type === 'form' &&
      annotation.side === line.side &&
      annotation.lineNumber === line.lineNumber,
  );
}

function sortAnnotations(annotations: readonly DiffAnnotation[]) {
  return annotations.toSorted(
    (a, b) =>
      a.lineNumber - b.lineNumber ||
      ANNOTATION_SIDE_ORDER[a.side] - ANNOTATION_SIDE_ORDER[b.side],
  );
}
