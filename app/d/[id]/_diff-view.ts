import {computeDiffStats} from '@/lib/diffs/stats';
import {prepareTreeHandoff, sortFilesByTreeOrder} from '@/lib/trees/handoff';

import type {FileDiffMetadata} from '@pierre/diffs';

interface ShareFile {
  readonly id: string;
  readonly name: string;
  readonly metadata: FileDiffMetadata;
}

interface PrepareDiffViewOptions {
  readonly viewportHeight?: number;
}

export function prepareDiffView(
  files: readonly ShareFile[],
  {viewportHeight}: PrepareDiffViewOptions = {},
) {
  const metadata = files.map((f) => f.metadata);
  const tree = prepareTreeHandoff(metadata, {viewportHeight});

  return {
    stats: computeDiffStats(metadata),
    tree,
    files: sortFilesByTreeOrder(files, tree.paths),
  };
}
