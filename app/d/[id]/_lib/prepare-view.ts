import {computeDiffStats} from '@/lib/diffs/stats';
import {prepareTreeHandoff, type TreeHandoff} from '@/lib/trees/handoff';

import type {FileDiffMetadata} from '@pierre/diffs';

interface ShareFile {
  readonly id: string;
  readonly name: string;
  readonly metadata: FileDiffMetadata;
}

export function prepareDiffView(
  files: readonly ShareFile[],
  options: {readonly viewportHeight?: number} = {},
) {
  const fileDiffs = files.map((file) => file.metadata);
  const tree = prepareTreeHandoff(fileDiffs, options);

  return {
    tree,
    stats: computeDiffStats(fileDiffs),
    files: orderFilesByTree(files, tree),
    fileIdsByPath: Object.fromEntries(files.map(({name, id}) => [name, id])),
  };
}

function orderFilesByTree(files: readonly ShareFile[], tree: TreeHandoff) {
  const rankByPath = new Map(tree.paths.map((path, rank) => [path, rank]));

  return files.toSorted(
    (a, b) =>
      (rankByPath.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
      (rankByPath.get(b.name) ?? Number.MAX_SAFE_INTEGER),
  );
}
