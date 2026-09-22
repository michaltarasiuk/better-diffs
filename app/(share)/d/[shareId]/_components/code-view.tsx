'use client';

import '@/diffs/diffs.css';

import {use} from 'react';
import {Button, Checkbox, cn, Focusable, Kbd, Tooltip} from '@heroui/react';
import type {FileDiffMetadata} from '@pierre/diffs';
import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView as DiffCodeView} from '@pierre/diffs/react';
import {ChevronDownIcon} from 'lucide-react';

import {useKeyDown} from '@/hooks/use-key-down';
import {useIsMobile} from '@/hooks/use-media-query';
import {isDefined} from '@/utils/is-defined';
import {isEditableTarget} from '@/utils/is-editable-target';
import {isUnmodifiedKeyDown} from '@/utils/is-unmodified-key-down';
import type {AnnotationMetadata} from '@/diffs/annotations';
import {
  isDiffLine,
  isFormAnnotation,
  sortAnnotations,
  toThreadAnnotation,
} from '@/diffs/annotations';
import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {ShareStateContext} from '@/events/provider';
import type {ThreadState} from '@/events/state';
import {useLines} from '../_hooks/use-lines';
import {activeFileId} from '../_lib/active-file-id';
import {AddCommentButton, Annotation} from './annotation';
import {FileStateContext, HandleContext} from './provider';

const DEFAULT_THREADS: readonly ThreadState[] = [];

const CODE_VIEW_STYLE = {
  height: '100%',
  overflow: 'auto',
} satisfies React.CSSProperties;

interface CodeViewProps {
  readonly files: readonly {
    readonly id: string;
    readonly metadata: FileDiffMetadata;
  }[];
}

export function CodeView({files}: CodeViewProps) {
  const {
    getFileState,
    toggleFileCollapsed,
    setFileViewed,
    toggleFileViewed,
    addCommentForm,
    removeCommentForm,
  } = use(FileStateContext);
  const {selectedLines, setSelectedLines} = useLines();

  const isMobile = useIsMobile();

  const shareState = use(ShareStateContext);
  const codeViewRef = use(HandleContext);

  const threadsByFilePath = Map.groupBy(
    shareState.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  useKeyDown(function toggleViewed(event) {
    if (!isUnmodifiedKeyDown(event, 'v') || isEditableTarget(event.target)) {
      return;
    }

    const codeView = codeViewRef.current?.getInstance();
    if (!isDefined(codeView)) {
      return;
    }

    const fileId = activeFileId(codeView);
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
    <DiffCodeView
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
        <CollapseButton
          collapsed={getFileState(item.id).collapsed}
          onToggleCollapsed={() => toggleFileCollapsed(item.id)}
        />
      )}
      renderHeaderMetadata={(item) => (
        <ViewedCheckbox
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
            fileId={item.id}
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
      className="outline-none"
    />
  );
}

function CollapseButton({
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

function ViewedCheckbox({
  viewed,
  onViewedChange,
}: {
  readonly viewed: boolean;
  readonly onViewedChange: (viewed: boolean) => void;
}) {
  return (
    <Tooltip>
      <Focusable>
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
