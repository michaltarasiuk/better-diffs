'use client';

import '@/diffs/diffs.css';

import {use, useState} from 'react';
import type {FileDiffMetadata, GetHoveredLineResult} from '@pierre/diffs';
import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';

import {useIsMobile} from '@/hooks/use-media-query';
import {assert} from '@/utils/assert';
import {isDefined} from '@/utils/defined';
import type {AnnotationMetadata} from '@/diffs/options';
import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {ShareStateContext} from '@/events/share-events-provider';
import type {ThreadState} from '@/events/share-state';
import {useSelectedLines} from '../_hooks/use-selected-lines';
import {HandleContext} from '../_lib/handle-context';
import {
  AddCommentButton,
  Annotation,
  type DiffAnnotation,
  type FormDiffAnnotation,
  isFormAnnotation,
} from './annotation';
import {FileCollapseButton} from './file-collapse-button';

type DiffLine = GetHoveredLineResult<'diff'>;
type HoveredLine = GetHoveredLineResult<'file'> | DiffLine;

interface FileState {
  readonly forms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly version: number;
}

const DEFAULT_FILE_STATE = {
  forms: [],
  collapsed: false,
  version: 0,
} satisfies FileState;

const DEFAULT_THREADS: readonly ThreadState[] = [];

const CODE_VIEW_STYLE = {
  height: '100%',
  overflow: 'auto',
} satisfies React.CSSProperties;

const ANNOTATION_SIDE_ORDER = {
  deletions: 0,
  additions: 1,
} as const;

interface DiffFilesProps {
  readonly files: readonly {
    readonly id: string;
    readonly metadata: FileDiffMetadata;
  }[];
}

export function DiffFiles({files}: DiffFilesProps) {
  const [fileStateById, setFileStateById] = useState(
    () => new Map() as ReadonlyMap<string, FileState>,
  );
  const {selectedLines, setSelectedLines} = useSelectedLines();

  const isMobile = useIsMobile();

  const share = use(ShareStateContext);
  const handleRef = use(HandleContext);

  const threadsByFilePath = Map.groupBy(
    share.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  function getFileState(fileId: string) {
    return fileStateById.get(fileId) ?? DEFAULT_FILE_STATE;
  }

  function getThreads(filePath: string) {
    return threadsByFilePath.get(filePath) ?? DEFAULT_THREADS;
  }

  function updateFileState(
    fileId: string,
    update: (state: FileState) => FileState,
  ) {
    setFileStateById((fileStates) => {
      const state = fileStates.get(fileId) ?? DEFAULT_FILE_STATE;

      return new Map(fileStates).set(fileId, {
        ...update(state),
        version: state.version + 1,
      });
    });
  }

  function toggleFileCollapsed(fileId: string) {
    updateFileState(fileId, (state) => ({
      ...state,
      collapsed: !state.collapsed,
    }));
  }

  function addCommentForm(fileId: string, line: DiffLine) {
    updateFileState(fileId, (state) => ({
      ...state,
      forms: sortAnnotations([
        ...state.forms,
        {
          ...line,
          metadata: {type: 'form'},
        },
      ]),
    }));
  }

  function removeForm(fileId: string, form: FormDiffAnnotation) {
    updateFileState(fileId, (state) => ({
      ...state,
      forms: state.forms.toSpliced(state.forms.indexOf(form), 1),
    }));
  }

  return (
    <CodeView
      ref={handleRef}
      items={files.map((file) => {
        const {forms, collapsed, version} = getFileState(file.id);
        const threads = getThreads(file.metadata.name);

        return {
          id: file.id,
          type: 'diff' as const,
          fileDiff: file.metadata,
          annotations: sortAnnotations([
            ...threads.map(toThreadAnnotation),
            ...forms,
          ]),
          collapsed,
          version: version + share.version,
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
        <AddCommentButton
          onAddAnnotation={() => {
            const line = getHoveredLine();
            assert(
              isDefined(line) && isDiffLine(line),
              'Hovered diff line missing',
            );
            addCommentForm(item.id, line);
          }}
        />
      )}
      renderAnnotation={(lineAnnotation, item) =>
        item.type === 'diff' &&
        isDiffAnnotation<AnnotationMetadata>(lineAnnotation) ? (
          <Annotation
            annotation={lineAnnotation}
            filePath={item.fileDiff.name}
            onDismiss={() => {
              if (isFormAnnotation(lineAnnotation)) {
                removeForm(item.id, lineAnnotation);
              }
            }}
          />
        ) : null
      }
      options={{
        ...CODE_VIEW_OPTIONS,
        diffStyle: isMobile ? 'unified' : 'split',
      }}
      style={CODE_VIEW_STYLE}
    />
  );
}

function toThreadAnnotation(thread: ThreadState): DiffAnnotation {
  return {
    side: thread.anchor.side,
    lineNumber: thread.anchor.line,
    metadata: {type: 'thread', threadId: thread.id},
  };
}

function sortAnnotations<T extends DiffAnnotation>(annotations: readonly T[]) {
  return annotations.toSorted(
    (a, b) =>
      a.lineNumber - b.lineNumber ||
      ANNOTATION_SIDE_ORDER[a.side] - ANNOTATION_SIDE_ORDER[b.side],
  );
}

function isDiffLine(line: HoveredLine): line is DiffLine {
  return 'side' in line;
}
