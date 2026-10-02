import type {FileDiffOptions} from '@pierre/diffs';
import {DEFAULT_CODE_VIEW_LAYOUT, DEFAULT_THEMES} from '@pierre/diffs';
import type {CodeViewReactOptions} from '@pierre/diffs/react';

import type {AnnotationMetadata} from './annotations';
import {DIFFS_SINGLE_COLUMN_ANNOTATION_UNSAFE_CSS} from './unsafe-css';

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
    unsafeCSS: DIFFS_SINGLE_COLUMN_ANNOTATION_UNSAFE_CSS,
    layout: {
      ...DEFAULT_CODE_VIEW_LAYOUT,
      paddingTop: 0,
      paddingBottom: 0,
    },
  };
