import type {FileDiffOptions} from '@pierre/diffs';
import {DEFAULT_CODE_VIEW_LAYOUT, DEFAULT_THEMES} from '@pierre/diffs';
import type {CodeViewItem, CodeViewReactOptions} from '@pierre/diffs/react';

import type {AnnotationMetadata} from './annotations';
import {isEmptyDiff} from './empty';
import {
  DIFFS_EMPTY_DIFF_UNSAFE_CSS,
  DIFFS_SINGLE_COLUMN_ANNOTATION_UNSAFE_CSS,
  EMPTY_DIFF_ATTRIBUTE,
} from './unsafe-css';

export const PATCH_DIFF_OPTIONS: FileDiffOptions<AnnotationMetadata, null> = {
  theme: DEFAULT_THEMES,
  hunkSeparators: 'line-info-basic',
  diffStyle: 'unified',
  stickyHeader: false,
  overflow: 'wrap',
};

export const CODE_VIEW_OPTIONS: CodeViewReactOptions<AnnotationMetadata, null> =
  {
    theme: DEFAULT_THEMES,
    hunkSeparators: 'line-info-basic',
    stickyHeaders: true,
    enableGutterUtility: true,
    enableLineSelection: true,
    unsafeCSS: [
      DIFFS_SINGLE_COLUMN_ANNOTATION_UNSAFE_CSS,
      DIFFS_EMPTY_DIFF_UNSAFE_CSS,
    ].join('\n\n'),
    layout: {
      ...DEFAULT_CODE_VIEW_LAYOUT,
      paddingTop: 0,
      paddingBottom: 0,
    },
    onPostRender: markEmptyDiff,
  };

function markEmptyDiff(
  node: HTMLElement,
  _instance: unknown,
  _phase: unknown,
  {item}: {readonly item: CodeViewItem<AnnotationMetadata>},
) {
  node.toggleAttribute(
    EMPTY_DIFF_ATTRIBUTE,
    item.type === 'diff' && isEmptyDiff(item.fileDiff),
  );
}
