import {DEFAULT_THEMES} from '@pierre/diffs';

import {DIFFS_SPLIT_SCROLL_LAYOUT_UNSAFE_CSS} from './unsafe-css';

import type {FileDiffOptions} from '@pierre/diffs';

export interface AnnotationMetadata {
  readonly type: 'form' | 'thread';
}

export const DIFF_VIEWER_OPTIONS: FileDiffOptions<AnnotationMetadata> = {
  theme: DEFAULT_THEMES,
  hunkSeparators: 'line-info-basic',
  stickyHeader: true,
  unsafeCSS: DIFFS_SPLIT_SCROLL_LAYOUT_UNSAFE_CSS,
};
