'use client';

import '@/diffs/diffs.css';

import {use} from 'react';
import {Button, Checkbox, cn, Focusable, Kbd, Tooltip} from '@heroui/react';
import type {FileDiffMetadata} from '@pierre/diffs';
import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';
import {ChevronDownIcon} from 'lucide-react';

import {useKeyDown} from '@/hooks/use-key-down';
import {useIsMobile} from '@/hooks/use-media-query';
import {isDefined} from '@/utils/defined';
import {isEditableTarget} from '@/utils/is-editable-target';
import {
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
import {useDiffFileUi} from '../_hooks/use-diff-file-ui';
import {useSelectedLines} from '../_hooks/use-selected-lines';
import {getActiveFileId} from '../_lib/get-active-file-id';
import {HandleContext} from '../_lib/handle-context';
import {AddCommentButton, Annotation} from './annotation';

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

  const {
    getFileUi,
    toggleFileCollapsed,
    setFileViewed,
    addCommentForm,
    removeCommentForm,
  } = useDiffFileUi(shareId);
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
    codeView.scrollTo({type: 'item', id: fileId, align: 'start'});
  });

  function getThreadsForPath(filePath: string) {
    return threadsByFilePath.get(filePath) ?? DEFAULT_THREADS;
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
              return;
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
                removeCommentForm(item.id, lineAnnotation.metadata.formId);
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
