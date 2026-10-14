'use client';

import '@/diffs/diffs.css';

import {Button, Checkbox, cn, Kbd, Tooltip} from '@heroui/react';
import {
  isDiffAnnotation,
  type CodeViewItem,
  type FileDiffMetadata,
} from '@pierre/diffs';
import {CodeView} from '@pierre/diffs/react';
import {ChevronDownIcon} from 'lucide-react';

import {
  sortAnnotations,
  toThreadAnnotation,
  type AnnotationMetadata,
} from '@/diffs/annotations';
import {isEmptyDiff} from '@/diffs/empty';
import {isDiffLine} from '@/diffs/lines';
import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {useIsMobile} from '@/hooks/use-is-mobile';
import {useShortcut} from '@/hooks/use-shortcut';
import {useShareState} from '@/threads/provider';
import {isDefined} from '@/utils/is-defined';

import {useSelectedLines} from '../_hooks/use-selected-lines';
import {getViewportFileId} from '../_lib/get-viewport-file-id';
import {scrollToFile} from '../_lib/scroll-to-file';
import {AddCommentButton} from './add-comment-button';
import {Annotation} from './annotation';
import {useCodeViewRef} from './code-view-provider';
import {useReviewState} from './review-state-provider';

interface DiffViewProps {
  readonly files: readonly {
    readonly id: string;
    readonly metadata: FileDiffMetadata;
  }[];
}

export function DiffView({files}: DiffViewProps) {
  const {
    getFileState,
    toggleFileCollapsed,
    setFileViewed,
    toggleFileViewed,
    addCommentForm,
  } = useReviewState();
  const share = useShareState();
  const codeViewRef = useCodeViewRef();
  const {selectedLines, setSelectedLines} = useSelectedLines();
  const isMobile = useIsMobile();

  const threadsByFilePath = Map.groupBy(
    share.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  useShortcut('v', function toggleViewed() {
    const codeView = codeViewRef.current?.getInstance();
    if (!isDefined(codeView)) {
      return;
    }

    const fileId = getViewportFileId(codeView);
    if (!isDefined(fileId)) {
      return;
    }

    toggleFileViewed(fileId);
    scrollToFile(codeView, fileId);
  });

  return (
    <CodeView
      ref={codeViewRef}
      items={files.map((file) => {
        const {commentForms, collapsed, version} = getFileState(file.id);
        const threads = threadsByFilePath.get(file.metadata.name) ?? [];

        return {
          id: file.id,
          type: 'diff' as const,
          fileDiff: file.metadata,
          annotations: sortAnnotations([
            ...threads.map(toThreadAnnotation),
            ...commentForms,
          ]),
          collapsed,
          version: version + share.version,
        };
      })}
      selectedLines={selectedLines}
      onSelectedLinesChange={setSelectedLines}
      renderHeaderPrefix={(item) =>
        isEmptyDiffItem(item) ? (
          <span aria-hidden className="block size-8 shrink-0" />
        ) : (
          <CollapseButton
            collapsed={getFileState(item.id).collapsed}
            onToggleCollapsed={() => toggleFileCollapsed(item.id)}
          />
        )
      }
      renderHeaderFilenameSuffix={(item) =>
        isEmptyDiffItem(item) ? (
          <span className="text-xs text-muted">No text changes</span>
        ) : null
      }
      renderHeaderMetadata={(item) => (
        <ViewedCheckbox
          viewed={getFileState(item.id).viewed}
          onViewedChange={(viewed) => setFileViewed(item.id, viewed)}
        />
      )}
      renderGutterUtility={(getHoveredLine, item) => (
        <AddCommentButton
          onPress={() => {
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
          />
        ) : null
      }
      options={{
        ...CODE_VIEW_OPTIONS,
        diffStyle: isMobile ? 'unified' : 'split',
      }}
      style={{
        height: '100%',
        overflow: 'auto',
      }}
      className="outline-none"
    />
  );
}

function isEmptyDiffItem(item: CodeViewItem<AnnotationMetadata>) {
  return item.type === 'diff' && isEmptyDiff(item.fileDiff);
}

interface CollapseButtonProps {
  readonly collapsed: boolean;
  readonly onToggleCollapsed: () => void;
}

function CollapseButton({collapsed, onToggleCollapsed}: CollapseButtonProps) {
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

interface ViewedCheckboxProps {
  readonly viewed: boolean;
  readonly onViewedChange: (viewed: boolean) => void;
}

function ViewedCheckbox({viewed, onViewedChange}: ViewedCheckboxProps) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
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
      </Tooltip.Trigger>
      <Tooltip.Content placement="left" className="flex items-center gap-2">
        Viewed by me
        <Kbd>
          <Kbd.Content>v</Kbd.Content>
        </Kbd>
      </Tooltip.Content>
    </Tooltip>
  );
}
