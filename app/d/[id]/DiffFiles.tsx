'use client';

import '@/diffs/diffs.css';

import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';
import {use, useState} from 'react';

import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {useIsMobile} from '@/hooks/useMediaQuery';
import {isDefined} from '@/utils/defined';

import {
  AddCommentButton,
  Annotation,
  isFormAnnotation,
  type DiffAnnotation,
  type FormDiffAnnotation,
} from './Annotation';
import {FileCollapseButton} from './FileCollapseButton';
import {HandleContext} from './handleContext';
import {ShareStateContext} from './SyncEvents';
import {useSelectedLines} from './useSelectedLines';

import type {AnnotationMetadata} from '@/diffs/options';
import type {ThreadState} from '@/events/shareState';
import type {FileDiffMetadata, GetHoveredLineResult} from '@pierre/diffs';

type DiffLine = GetHoveredLineResult<'diff'>;
type HoveredLine = GetHoveredLineResult<'file'> | DiffLine;

interface FileState {
  readonly forms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly version: number;
}

const ANNOTATION_SIDE_ORDER = {
  deletions: 0,
  additions: 1,
} as const;

const CODE_VIEW_STYLE = {
  height: '100%',
  overflow: 'auto',
} satisfies React.CSSProperties;

const DEFAULT_FILE_STATE = {
  forms: [],
  collapsed: false,
  version: 0,
} satisfies FileState;

const EMPTY_THREADS: readonly ThreadState[] = [];

interface DiffFilesProps {
  readonly files: readonly {
    readonly id: string;
    readonly metadata: FileDiffMetadata;
  }[];
}

export function DiffFiles({files}: DiffFilesProps) {
  const share = useShareState();

  const [fileStateById, setFileStateById] = useState(
    () => new Map() as ReadonlyMap<string, FileState>,
  );
  const {selectedLines, setSelectedLines} = useSelectedLines();

  const isMobile = useIsMobile();

  const handleRef = use(HandleContext);

  const threadsByFilePath = Map.groupBy(
    share.state.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  function getFileState(fileId: string, stateById = fileStateById) {
    return stateById.get(fileId) ?? DEFAULT_FILE_STATE;
  }

  function updateFileState(
    fileId: string,
    update: (state: FileState) => FileState,
  ) {
    setFileStateById((fileStateById) => {
      const state = getFileState(fileId, fileStateById);

      return new Map(fileStateById).set(fileId, {
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
        const threads = threadsByFilePath.get(file.metadata.name);

        return {
          id: file.id,
          type: 'diff' as const,
          fileDiff: file.metadata,
          annotations: sortAnnotations([
            ...(threads ?? EMPTY_THREADS).map(toThreadAnnotation),
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
            if (isDefined(line) && isDiffLine(line)) {
              addCommentForm(item.id, line);
            }
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

function useShareState() {
  const state = use(ShareStateContext);
  const [prevState, setPrevState] = useState(state);
  const [version, setVersion] = useState(0);
  if (state !== prevState) {
    setPrevState(state);
    setVersion((version) => version + 1);
  }
  return {state, version};
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
