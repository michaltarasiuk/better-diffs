'use client';

import '@/diffs/diffs.css';

import {use} from 'react';
import {Button, Checkbox, cn, Focusable, Kbd, Tooltip} from '@heroui/react';
import type {FileDiffMetadata} from '@pierre/diffs';
import {isDiffAnnotation} from '@pierre/diffs';
import {CodeView as DiffCodeView} from '@pierre/diffs/react';
import {ChevronDownIcon} from 'lucide-react';

import {useIsMobile} from '@/hooks/use-is-mobile';
import {useKeyDown} from '@/hooks/use-key-down';
import {isDefined} from '@/utils/is-defined';
import {isEditableTarget} from '@/utils/is-editable-target';
import {isUnmodifiedKey} from '@/utils/is-unmodified-key';
import type {AnnotationMetadata} from '@/diffs/annotations';
import {sortAnnotations, toThreadAnnotation} from '@/diffs/annotations';
import {isDiffLine} from '@/diffs/lines';
import {CODE_VIEW_OPTIONS} from '@/diffs/options';
import {FoldedStateContext} from '@/events/provider';
import {useLines} from '../_hooks/use-lines';
import {activeFileId} from '../_lib/active-file-id';
import {Annotation} from './annotation';
import {GutterUtility} from './gutter-utility';
import {CodeViewRefContext, FileStatesContext} from './provider';

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
  } = use(FileStatesContext);
  const {selectedLines, setSelectedLines} = useLines();

  const isMobile = useIsMobile();

  const folded = use(FoldedStateContext);
  const codeViewRef = use(CodeViewRefContext);

  const threadsByFilePath = Map.groupBy(
    folded.threads.values(),
    (thread) => thread.anchor.filePath,
  );

  useKeyDown(function toggleViewed(event) {
    if (!isUnmodifiedKey(event, 'v') || isEditableTarget(event.target)) {
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
    codeView.scrollTo({
      type: 'item',
      id: fileId,
      align: 'start',
    });
  });

  function getThreadsForPath(filePath: string) {
    return threadsByFilePath.get(filePath) ?? [];
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
          version: version + folded.version,
        };
      })}
      selectedLines={selectedLines}
      onSelectedLinesChange={setSelectedLines}
      renderHeaderPrefix={(item) => {
        const collapsed = getFileState(item.id).collapsed;
        return (
          <CollapseButton
            key={item.id}
            collapsed={collapsed}
            onToggleCollapsed={() => toggleFileCollapsed(item.id)}
          />
        );
      }}
      renderHeaderMetadata={(item) => {
        const viewed = getFileState(item.id).viewed;
        return (
          <ViewedCheckbox
            viewed={viewed}
            onViewedChange={(viewed) => setFileViewed(item.id, viewed)}
          />
        );
      }}
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
