import type {FileDiffMetadata} from '@pierre/diffs';

import {preloadFileDiff} from '@pierre/diffs/ssr';

import {STATIC_DIFF_VIEWER_OPTIONS} from './options';

export interface PreloadedDiffItem {
  id: string;
  fileDiff: FileDiffMetadata;
  prerenderedHTML: string;
}

export async function preloadShareDiffs(
  patches: {files: FileDiffMetadata[]}[],
) {
  return Promise.all(
    patches.flatMap((patch) =>
      patch.files.map(async (fileDiff) => {
        const preloaded = await preloadFileDiff({
          fileDiff,
          options: STATIC_DIFF_VIEWER_OPTIONS,
        });

        return {
          id: preloaded.fileDiff.name,
          fileDiff: preloaded.fileDiff,
          prerenderedHTML: preloaded.prerenderedHTML,
        } satisfies PreloadedDiffItem;
      }),
    ),
  );
}
