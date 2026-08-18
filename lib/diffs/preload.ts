import 'server-only';

import type {FileDiffMetadata} from '@pierre/diffs';

import {preloadFileDiff} from '@pierre/diffs/ssr';

import {DIFF_VIEWER_OPTIONS} from './options';

export interface PreloadedDiffItem {
  readonly id: string;
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
}

export function preloadDiffs(files: readonly FileDiffMetadata[]) {
  return Promise.all(
    files.map(async (fileDiff): Promise<PreloadedDiffItem> => {
      const preloaded = await preloadFileDiff({
        fileDiff,
        options: DIFF_VIEWER_OPTIONS,
      });

      return {
        id: preloaded.fileDiff.name,
        fileDiff: preloaded.fileDiff,
        prerenderedHTML: preloaded.prerenderedHTML,
      };
    }),
  );
}
