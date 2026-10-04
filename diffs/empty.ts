import type {FileDiffMetadata} from '@pierre/diffs';

export function isEmptyDiff(fileDiff: Pick<FileDiffMetadata, 'hunks'>) {
  return fileDiff.hunks.length === 0;
}
