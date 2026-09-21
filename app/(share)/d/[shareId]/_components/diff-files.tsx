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
import {isGlobalShortcut} from '@/utils/is-global-shortcut';
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
import {useDiffFileState} from '../_hooks/use-diff-file-state';
import {useSelectedLines} from '../_hooks/use-selected-lines';
import {useShareId} from '../_hooks/use-share-id';
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
    getFileState,
    toggleFileCollapsed,
    setFileViewed,
    toggleFileViewed,
    addCommentForm,
    removeCommentForm,
  } = useDiffFileState(shareId);
  const {selectedLines, setSelectedLines} = useSelectedLines();

  const isMobile = useIsMobile();

  const shareState = use(ShareStateContext);
  const codeViewRef = use(HandleContext);

  const threadsByFilePath = Map.groupBy(
    shareState.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  useKeyDown(function toggleViewed(event) {
    if (!isGlobalShortcut(event, 'v')) {
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
    toggleFileViewed(fileId);
    codeView.scrollTo({type: 'item', id: fileId, align: 'start'});
  });

  function getThreadsForPath(filePath: string) {
    return threadsByFilePath.get(filePath) ?? DEFAULT_THREADS;
  }

  return (
    <CodeView
      ref={codeViewRef}
      items={files.map((file) => {
        const {commentForms, collapsed, version} = getFileState(file.id);
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
          version: version + shareState.version,
        };
      })}
      selectedLines={selectedLines}
      onSelectedLinesChange={setSelectedLines}
      renderHeaderPrefix={(item) => (
        <FileCollapseButton
          collapsed={getFileState(item.id).collapsed}
          onToggleCollapsed={() => toggleFileCollapsed(item.id)}
        />
      )}
      renderHeaderMetadata={(item) => (
        <FileViewedCheckbox
          viewed={getFileState(item.id).viewed}
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
      renderAnnotation={(annotation, item) =>
        item.type === 'diff' &&
        isDiffAnnotation<AnnotationMetadata>(annotation) ? (
          <Annotation
            annotation={annotation}
            filePath={item.fileDiff.name}
            onDismiss={() => {
              if (isFormAnnotation(annotation)) {
                removeCommentForm(item.id, annotation.metadata.formId);
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
