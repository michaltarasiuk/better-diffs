import type {FileDiffOptions} from '@pierre/diffs';

export const STATIC_DIFF_VIEWER_OPTIONS = {
  theme: {
    light: 'pierre-light',
    dark: 'pierre-dark',
  },
} as const satisfies FileDiffOptions<unknown>;
