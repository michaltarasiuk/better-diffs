import 'server-only';

import {preloadFileDiff} from '@pierre/diffs/ssr';

import {DIFF_VIEWER_OPTIONS} from './options';

import type {FileDiffMetadata} from '@pierre/diffs';

export interface DiffFile {
  readonly id: string;
  readonly metadata: FileDiffMetadata;
}

export function preloadDiffs(files: readonly DiffFile[]) {
  return Promise.all(
    files.map(async (f) => ({
      fileId: f.id,
      preloaded: await preloadFileDiff({
        fileDiff: f.metadata,
        options: DIFF_VIEWER_OPTIONS,
      }),
    })),
  );
}
