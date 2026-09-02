import {computeDiffStats} from '@/lib/diffs/stats';
import {prepareTreeHandoff, sortFilesByTreeOrder} from '@/lib/trees/handoff';

import type {FileDiffMetadata} from '@pierre/diffs';

interface ShareFile {
  readonly id: string;
  readonly name: string;
  readonly metadata: FileDiffMetadata;
}

export function prepareDiffView(
  files: readonly ShareFile[],
  {viewportHeight}: {readonly viewportHeight?: number} = {},
) {
  const metadata = files.map((f) => f.metadata);
  const tree = prepareTreeHandoff(metadata, {viewportHeight});

  return {
    tree,
    stats: computeDiffStats(metadata),
    files: sortFilesByTreeOrder(files, tree.paths),
    fileIdsByPath: Object.fromEntries(files.map((f) => [f.name, f.id])),
  };
}
