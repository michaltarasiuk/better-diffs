import {DEFAULT_CODE_VIEW_LAYOUT, DEFAULT_THEMES} from '@pierre/diffs';

import type {FileDiffOptions} from '@pierre/diffs';
import type {CodeViewReactOptions} from '@pierre/diffs/react';

export interface AnnotationMetadata {
  readonly type: 'form' | 'thread';
}

export const PATCH_DIFF_OPTIONS: FileDiffOptions<AnnotationMetadata> = {
  theme: DEFAULT_THEMES,
  hunkSeparators: 'line-info-basic',
  diffStyle: 'unified',
  stickyHeader: false,
  overflow: 'wrap',
};

export const CODE_VIEW_OPTIONS: CodeViewReactOptions<AnnotationMetadata> = {
  theme: DEFAULT_THEMES,
  hunkSeparators: 'line-info-basic',
  stickyHeaders: true,
  enableGutterUtility: true,
  enableLineSelection: true,
  layout: {
    ...DEFAULT_CODE_VIEW_LAYOUT,
    paddingTop: 0,
    paddingBottom: 0,
  },
};
