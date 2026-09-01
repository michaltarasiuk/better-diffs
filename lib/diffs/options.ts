import {DEFAULT_THEMES} from '@pierre/diffs';

import type {FileDiffOptions} from '@pierre/diffs';
import type {CodeViewReactOptions} from '@pierre/diffs/react';

export interface AnnotationMetadata {
  readonly type: 'form' | 'thread';
}

const SHARED_VIEWER_OPTIONS = {
  theme: DEFAULT_THEMES,
  hunkSeparators: 'line-info-basic',
} as const;

export const DIFF_VIEWER_OPTIONS: FileDiffOptions<AnnotationMetadata> = {
  ...SHARED_VIEWER_OPTIONS,
  stickyHeader: true,
};

export const CODE_VIEW_OPTIONS: CodeViewReactOptions<AnnotationMetadata> = {
  ...SHARED_VIEWER_OPTIONS,
  stickyHeaders: true,
  enableGutterUtility: true,
  enableLineSelection: true,
};
