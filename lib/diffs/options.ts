import {DEFAULT_THEMES, type FileDiffOptions} from '@pierre/diffs';

export const DIFF_VIEWER_OPTIONS = {
  theme: DEFAULT_THEMES,
  hunkSeparators: 'line-info-basic',
} satisfies FileDiffOptions<unknown>;
