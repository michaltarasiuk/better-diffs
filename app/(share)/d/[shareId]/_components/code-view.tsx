'use client';

import '@/diffs/diffs.css';

import {use} from 'react';

import {Button, Checkbox, cn, Focusable, Kbd, Tooltip} from '@heroui/react';
import type {FileDiffMetadata} from '@pierre/diffs';
import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView as DiffCodeView} from '@pierre/diffs/react';
import {ChevronDownIcon} from 'lucide-react';

import type {AnnotationMetadata} from '@/diffs/annotations';
import {sortAnnotations, toThreadAnnotation} from '@/diffs/annotations';
import {isEmptyDiff} from '@/diffs/empty';
import {isDiffLine} from '@/diffs/lines';
import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {FoldedStateContext} from '@/events/provider';
import {useIsMobile} from '@/hooks/use-is-mobile';
import {useShortcut} from '@/hooks/use-shortcut';
import {isDefined} from '@/utils/is-defined';

import {useLines} from '../_hooks/use-lines';
import {activeFileId} from '../_lib/active-file-id';
import {scrollToFile} from '../_lib/scroll-to-file';
import {Annotation} from './annotation';
import {GutterUtility} from './gutter-utility';
import {CodeViewRefContext, ReviewStateContext} from './provider';

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
  } = use(ReviewStateContext);
  const {selectedLines, setSelectedLines} = useLines();

  const isMobile = useIsMobile();

  const folded = use(FoldedStateContext);
  const codeViewRef = use(CodeViewRefContext);

  const threadsByFilePath = Map.groupBy(
    folded.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  useShortcut('v', function toggleViewed() {
    const codeView = codeViewRef.current?.getInstance();
    const fileId = isDefined(codeView) ? activeFileId(codeView) : null;
    if (!isDefined(codeView) || !isDefined(fileId)) {
      return;
    }

    toggleFileViewed(fileId);
    scrollToFile(codeView, fileId);
  });

  return (
    <DiffCodeView
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
          version: version + folded.version,
        };
      })}
      selectedLines={selectedLines}
      onSelectedLinesChange={setSelectedLines}
      renderHeaderPrefix={(item) =>
        item.type === 'diff' && isEmptyDiff(item.fileDiff) ? (
          <span aria-hidden className="block size-8 shrink-0" />
        ) : (
          <CollapseButton
            collapsed={getFileState(item.id).collapsed}
            onToggleCollapsed={() => toggleFileCollapsed(item.id)}
          />
        )
      }
      renderHeaderFilenameSuffix={(item) =>
        item.type === 'diff' && isEmptyDiff(item.fileDiff) ? (
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
        <GutterUtility
          onPress={() => {
            const line = getHoveredLine();
            if (!isDefined(line) || !isDiffLine(line)) {
              return;
            }
            addCommentForm(item.id, line);
          }}
        />
      )}
      renderAnnotation={(annotation, item) => {
        const isDiff =
          item.type === 'diff' &&
          isDiffAnnotation<AnnotationMetadata>(annotation);

        return isDiff ? (
          <Annotation
            annotation={annotation}
            fileId={item.id}
            filePath={item.fileDiff.name}
          />
        ) : null;
      }}
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
      <Tooltip.Content placement="left" className="flex items-center gap-2">
        Viewed by me
        <Kbd>
          <Kbd.Content>v</Kbd.Content>
        </Kbd>
      </Tooltip.Content>
    </Tooltip>
  );
}
