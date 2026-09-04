'use client';

import '@/lib/diffs/diffs.css';

import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';
import {use, useState} from 'react';

import {CODE_VIEW_OPTIONS} from '@/lib/diffs/options';
import {useIsDesktop} from '@/lib/hooks/use-media-query';
import {isDefined} from '@/lib/utils/defined';

import {useSelectedLines} from '../_lib/use-selected-lines';
import {Annotation, GutterUtility, type DiffAnnotation} from './annotations';
import {DiffViewerContext} from './context';
import {FileCollapseButton} from './file-collapse-button';

import type {FileDiffMetadata, GetHoveredLineResult} from '@pierre/diffs';

const ANNOTATION_SIDE_ORDER = {
  deletions: 0,
  additions: 1,
} as const;

const CODE_VIEW_STYLE = {
  height: '100%',
  overflow: 'auto',
} satisfies React.CSSProperties;

const DEFAULT_FILE_VIEW_STATE = {
  annotations: [],
  collapsed: false,
  version: 0,
} satisfies FileViewState;

type DiffLine = GetHoveredLineResult<'diff'>;
type HoveredLine = GetHoveredLineResult<'file'> | DiffLine;

interface FileViewState {
  readonly annotations: DiffAnnotation[];
  readonly collapsed: boolean;
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
  const [fileStateById, setFileStateById] = useState(
    () => new Map() as ReadonlyMap<string, FileViewState>,
  );
  const {selectedLines, setSelectedLines} = useSelectedLines();

  const isDesktop = useIsDesktop();

  const viewerRef = use(DiffViewerContext);

  function getFileState(fileId: string, fileStateMap = fileStateById) {
    return fileStateMap.get(fileId) ?? DEFAULT_FILE_VIEW_STATE;
  }

  function updateFileState(
    fileId: string,
    update: (state: FileViewState) => FileViewState,
  ) {
    setFileStateById((fileStateById) => {
      const state = getFileState(fileId, fileStateById);

      return new Map(fileStateById).set(fileId, {
        ...update(state),
        version: state.version + 1,
      });
    });
  }

  function updateAnnotations(
    fileId: string,
    update: (annotations: DiffAnnotation[]) => DiffAnnotation[],
  ) {
    updateFileState(fileId, (state) => ({
      ...state,
      annotations: update(state.annotations),
    }));
  }

  function toggleFileCollapsed(fileId: string) {
    updateFileState(fileId, (state) => ({
      ...state,
      collapsed: !state.collapsed,
    }));
  }

  function addCommentForm(fileId: string, line: DiffLine) {
    updateAnnotations(fileId, (annotations) =>
      sortAnnotations([
        ...annotations,
        {
          ...line,
          metadata: {type: 'form'},
        },
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
      items={files.map((file) => {
        const {annotations, collapsed, version} = getFileState(file.id);

        return {
          id: file.id,
          type: 'diff',
          fileDiff: file.metadata,
          annotations,
          collapsed,
          version,
        };
      })}
      renderHeaderPrefix={(item) => (
        <FileCollapseButton
          collapsed={getFileState(item.id).collapsed}
          onToggle={() => toggleFileCollapsed(item.id)}
        />
      )}
      selectedLines={selectedLines}
      onSelectedLinesChange={setSelectedLines}
      renderGutterUtility={(getHoveredLine, item) => (
        <GutterUtility
          onAddAnnotation={() => {
            const line = getHoveredLine();
            if (isDefined(line) && isDiffLine(line)) {
              addCommentForm(item.id, line);
            }
          }}
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
      options={{
        ...CODE_VIEW_OPTIONS,
        diffStyle: isDesktop ? 'split' : 'unified',
      }}
      style={CODE_VIEW_STYLE}
    />
  );
}

function isDiffLine(line: HoveredLine): line is DiffLine {
  return 'side' in line;
}

function sortAnnotations(annotations: readonly DiffAnnotation[]) {
  return annotations.toSorted(
    (a, b) =>
      a.lineNumber - b.lineNumber ||
      ANNOTATION_SIDE_ORDER[a.side] - ANNOTATION_SIDE_ORDER[b.side],
  );
}
