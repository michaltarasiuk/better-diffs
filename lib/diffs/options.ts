import {DEFAULT_THEMES, type FileDiffOptions} from '@pierre/diffs';

import {DIFFS_SPLIT_SCROLL_LAYOUT_UNSAFE_CSS} from './unsafe-css';

export const DIFF_VIEWER_OPTIONS = {
  theme: DEFAULT_THEMES,
  hunkSeparators: 'line-info-basic',
  stickyHeader: true,
  unsafeCSS: DIFFS_SPLIT_SCROLL_LAYOUT_UNSAFE_CSS,
} satisfies FileDiffOptions<unknown>;
