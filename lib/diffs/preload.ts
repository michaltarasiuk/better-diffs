import 'server-only';

import type {FileDiffMetadata} from '@pierre/diffs';

import {preloadFileDiff} from '@pierre/diffs/ssr';

import type {
  FormAnnotationLocation,
  LineAnnotation,
} from '@/lib/diffs/annotation';

import {DIFF_VIEWER_OPTIONS} from './options';

export function preloadDiffs(
  files: readonly FileDiffMetadata[],
  formAnnotations: readonly FormAnnotationLocation[] = [],
) {
  const formAnnotationsByFile = Map.groupBy(formAnnotations, ({file}) => file);

  return Promise.all(
    files.map(async (fileDiff) => {
      const annotations = (formAnnotationsByFile.get(fileDiff.name) ?? []).map(
        ({lineNumber, side}): LineAnnotation => ({
          lineNumber,
          side,
          metadata: {type: 'form'},
        }),
      );

      const preloaded = await preloadFileDiff({
        fileDiff,
        annotations,
        options: DIFF_VIEWER_OPTIONS,
      });

      return {
        id: preloaded.fileDiff.name,
        fileDiff: preloaded.fileDiff,
        prerenderedHTML: preloaded.prerenderedHTML,
        annotations: preloaded.annotations,
      };
    }),
  );
}
