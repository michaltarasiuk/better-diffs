import type {FileDiffMetadata} from '@pierre/diffs';

import {preloadFileDiff} from '@pierre/diffs/ssr';

import {STATIC_DIFF_VIEWER_OPTIONS} from './options';

export interface PreloadedDiffItem {
  readonly id: string;
  readonly fileDiff: FileDiffMetadata;
  readonly prerenderedHTML: string;
}

export async function preloadShareDiffs(
  patches: readonly {files: readonly FileDiffMetadata[]}[],
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
