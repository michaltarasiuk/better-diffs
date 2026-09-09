'use client';

import '@/diffs/diffs.css';

import {Button, cn} from '@heroui/react';
import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';
import {ChevronDownIcon} from 'lucide-react';
import {use, useState} from 'react';

import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {useIsMobile} from '@/hooks/useMediaQuery';
import {isDefined} from '@/utils/defined';

import {Annotation, GutterUtility, type DiffAnnotation} from './Annotations';
import {DiffHandleContext} from './DiffHandleContext';
import {useSelectedLines} from './useSelectedLines';

import type {AnnotationMetadata} from '@/diffs/options';
import type {FileDiffMetadata, GetHoveredLineResult} from '@pierre/diffs';

const ANNOTATION_SIDE_ORDER = {
  deletions: 0,
  additions: 1,
} as const;

const CODE_VIEW_STYLE = {
  height: '100%',
  overflow: 'auto',
} satisfies React.CSSProperties;

const DEFAULT_FILE_STATE = {
  annotations: [],
  collapsed: false,
  version: 0,
} satisfies FileState;

type DiffLine = GetHoveredLineResult<'diff'>;
type HoveredLine = GetHoveredLineResult<'file'> | DiffLine;

interface FileState {
  readonly annotations: DiffAnnotation[];
  readonly collapsed: boolean;
  readonly version: number;
}

interface DiffReviewProps {
  readonly files: readonly {
    readonly id: string;
    readonly metadata: FileDiffMetadata;
  }[];
}

export function DiffReview({files}: DiffReviewProps) {
  const [fileStateById, setFileStateById] = useState(
    () => new Map() as ReadonlyMap<string, FileState>,
  );
  const {selectedLines, setSelectedLines} = useSelectedLines();

  const isMobile = useIsMobile();

  const diffHandleRef = use(DiffHandleContext);

  function getFileState(fileId: string, fileStateMap = fileStateById) {
    return fileStateMap.get(fileId) ?? DEFAULT_FILE_STATE;
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
      ref={diffHandleRef}
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
        isDiffAnnotation<AnnotationMetadata>(annotation) ? (
          <Annotation
            annotation={annotation}
            onDismiss={() => removeAnnotation(item.id, annotation)}
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

interface FileCollapseButtonProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

function FileCollapseButton({collapsed, onToggle}: FileCollapseButtonProps) {
  return (
    <Button
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand file' : 'Collapse file'}
      variant="ghost"
      size="sm"
      isIconOnly
      onPress={onToggle}
      className="size-7 min-w-7 shrink-0"
    >
      <ChevronDownIcon
        aria-hidden
        className={cn(
          'size-4 shrink-0 transition-transform',
          collapsed && '-rotate-90',
        )}
      />
    </Button>
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
