import 'server-only';

import {preloadFileDiff} from '@pierre/diffs/ssr';

import {
  toFormAnnotation,
  type FormLocation,
  type ThreadAnnotation,
} from '@/lib/diffs/annotation';

import {DIFF_VIEWER_OPTIONS} from './options';

import type {FileDiffMetadata} from '@pierre/diffs';

export function preloadDiffs(
  files: readonly FileDiffMetadata[],
  formLocations: readonly FormLocation[],
) {
  const formLocationsByFile = Map.groupBy(formLocations, (a) => a.file);

  return Promise.all(
    files.map(async (f) => {
      const formAnnotations = (formLocationsByFile.get(f.name) ?? []).map(
        toFormAnnotation,
      );

      const preloaded = await preloadFileDiff({
        fileDiff: f,
        annotations: formAnnotations,
        options: DIFF_VIEWER_OPTIONS,
      });

      return {
        id: preloaded.fileDiff.name,
        fileDiff: preloaded.fileDiff,
        prerenderedHTML: preloaded.prerenderedHTML,
        threadAnnotations: [] as ThreadAnnotation[],
      };
    }),
  );
}
