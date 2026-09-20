'use client';

import '@/diffs/diffs.css';

import {use} from 'react';
import {flushSync} from 'react-dom';
import {Button, Checkbox, cn, Focusable, Kbd, Tooltip} from '@heroui/react';
import type {FileDiffMetadata, GetHoveredLineResult} from '@pierre/diffs';
import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';
import {ChevronDownIcon} from 'lucide-react';

import {useKeyDown} from '@/hooks/use-key-down';
import {useLocalStorage} from '@/hooks/use-local-storage';
import {useIsMobile} from '@/hooks/use-media-query';
import {isDefined} from '@/utils/defined';
import {isEditableTarget} from '@/utils/is-editable-target';
import {deserializeMap, serializeMap} from '@/utils/serialize-map';
import {
  type FormDiffAnnotation,
  isDiffLine,
  isFormAnnotation,
  sortAnnotations,
  toThreadAnnotation,
} from '@/diffs/annotations';
import type {AnnotationMetadata} from '@/diffs/options';
import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {ShareStateContext} from '@/events/share-events-provider';
import type {ThreadState} from '@/events/share-state';
import {useShareId} from '@/app/(share)/d/[shareId]/_hooks/use-share-id';
import {useSelectedLines} from '../_hooks/use-selected-lines';
import {getActiveFileId} from '../_lib/get-active-file-id';
import {HandleContext} from '../_lib/handle-context';
import {AddCommentButton, Annotation} from './annotation';

type HoveredDiffLine = GetHoveredLineResult<'diff'>;

interface DiffFileUiState {
  readonly commentForms: readonly FormDiffAnnotation[];
  readonly collapsed: boolean;
  readonly viewed: boolean;
  readonly localVersion: number;
}

const DEFAULT_FILE_UI = {
  commentForms: [],
  collapsed: false,
  viewed: false,
  localVersion: 0,
} satisfies DiffFileUiState;

const DEFAULT_THREADS: readonly ThreadState[] = [];

const CODE_VIEW_STYLE = {
  height: '100%',
  overflow: 'auto',
} satisfies React.CSSProperties;

interface DiffFilesProps {
  readonly files: readonly {
    readonly id: string;
    readonly metadata: FileDiffMetadata;
  }[];
}

export function DiffFiles({files}: DiffFilesProps) {
  const shareId = useShareId();

  const [fileUiById, setFileUiById] = useLocalStorage(
    `diff:v1:${shareId}`,
    () => new Map() as ReadonlyMap<string, DiffFileUiState>,
    {
      serialize: serializeMap<string, DiffFileUiState>,
      deserialize: deserializeMap<string, DiffFileUiState>,
    },
  );
  const {selectedLines, setSelectedLines} = useSelectedLines();

  const isMobile = useIsMobile();

  const shareState = use(ShareStateContext);
  const codeViewRef = use(HandleContext);

  const threadsByFilePath = Map.groupBy(
    shareState.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  useKeyDown(function toggleActiveFileViewed(event) {
    if (
      event.key !== 'v' ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    const codeView = codeViewRef.current?.getInstance();
    if (!isDefined(codeView)) {
      return;
    }

    const fileId = getActiveFileId(
      codeView,
      files.map((file) => file.id),
    );
    if (!isDefined(fileId)) {
      return;
    }

    event.preventDefault();
    setFileViewed(fileId, !getFileUi(fileId).viewed);
  });

  function getFileUi(fileId: string) {
    return {
      ...DEFAULT_FILE_UI,
      ...fileUiById.get(fileId),
    };
  }

  function getThreadsForPath(filePath: string) {
    return threadsByFilePath.get(filePath) ?? DEFAULT_THREADS;
  }

  function updateFileUi(
    fileId: string,
    update: (state: DiffFileUiState) => DiffFileUiState,
  ) {
    setFileUiById((fileUis) => {
      const state = {
        ...DEFAULT_FILE_UI,
        ...fileUis.get(fileId),
      };

      return new Map(fileUis).set(fileId, {
        ...update(state),
        localVersion: state.localVersion + 1,
      });
    });
  }

  function toggleFileCollapsed(fileId: string) {
    updateFileUi(fileId, (state) => ({
      ...state,
      collapsed: !state.collapsed,
    }));
  }

  function setFileViewed(fileId: string, viewed: boolean) {
    updateFileUi(fileId, (state) => ({
      ...state,
      viewed,
      collapsed: viewed,
    }));
  }

  function addCommentForm(fileId: string, line: HoveredDiffLine) {
    updateFileUi(fileId, (state) => ({
      ...state,
      commentForms: sortAnnotations([
        ...state.commentForms,
        {
          ...line,
          metadata: {type: 'form'},
        },
      ]),
    }));
  }

  function removeCommentForm(fileId: string, form: FormDiffAnnotation) {
    updateFileUi(fileId, (state) => ({
      ...state,
      commentForms: state.commentForms.toSpliced(
        state.commentForms.indexOf(form),
        1,
      ),
    }));
  }

  return (
    <CodeView
      ref={codeViewRef}
      items={files.map((file) => {
        const {commentForms, collapsed, localVersion} = getFileUi(file.id);
        const threads = getThreadsForPath(file.metadata.name);

        return {
          id: file.id,
          type: 'diff' as const,
          fileDiff: file.metadata,
          annotations: sortAnnotations([
            ...threads.map(toThreadAnnotation),
            ...commentForms,
          ]),
          collapsed,
          version: localVersion + shareState.version,
        };
      })}
      selectedLines={selectedLines}
      onSelectedLinesChange={setSelectedLines}
      renderHeaderPrefix={(item) => (
        <FileCollapseButton
          collapsed={getFileUi(item.id).collapsed}
          onToggleCollapsed={() => toggleFileCollapsed(item.id)}
        />
      )}
      renderHeaderMetadata={(item) => (
        <FileViewedCheckbox
          viewed={getFileUi(item.id).viewed}
          onViewedChange={(viewed) => setFileViewed(item.id, viewed)}
        />
      )}
      renderGutterUtility={(getHoveredLine, item) => (
        <AddCommentButton
          onAddAnnotation={() => {
            const line = getHoveredLine();
            if (!isDefined(line) || !isDiffLine(line)) {
              throw new TypeError('Hovered diff line missing');
            }
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
                removeCommentForm(item.id, lineAnnotation);
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

function FileCollapseButton({
  collapsed,
  onToggleCollapsed,
}: {
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
}) {
  return (
    <Button
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand file' : 'Collapse file'}
      variant="ghost"
      size="sm"
      isIconOnly
      onPress={onToggleCollapsed}
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

function FileViewedCheckbox({
  viewed,
  onViewedChange,
}: {
  readonly viewed: boolean;
  readonly onViewedChange: (viewed: boolean) => void;
}) {
  return (
    <Tooltip>
      <Focusable>
        <span className="inline-flex">
          <Checkbox
            aria-keyshortcuts="v"
            variant="secondary"
            isSelected={viewed}
            onChange={onViewedChange}
            className="text-xs"
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              Viewed
            </Checkbox.Content>
          </Checkbox>
        </span>
      </Focusable>
      <Tooltip.Content
        showArrow
        placement="top"
        className="flex items-center gap-2"
      >
        <Tooltip.Arrow />
        Viewed by me
        <Kbd>
          <Kbd.Content>v</Kbd.Content>
        </Kbd>
      </Tooltip.Content>
    </Tooltip>
  );
}
