import 'server-only';

import {preloadFileDiff} from '@pierre/diffs/ssr';

import {DIFF_VIEWER_OPTIONS} from './options';

import type {FileDiffMetadata} from '@pierre/diffs';

export function preloadDiffs(files: readonly FileDiffMetadata[]) {
  return Promise.all(
    files.map((f) =>
      preloadFileDiff({
        fileDiff: f,
        options: DIFF_VIEWER_OPTIONS,
      }),
    ),
  );
}
