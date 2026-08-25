import type {FileDiffMetadata} from '@pierre/diffs';

export function computeDiffStats(files: readonly FileDiffMetadata[]) {
  let additions = 0;
  let deletions = 0;

  for (const file of files) {
    for (const hunk of file.hunks) {
      additions += hunk.additionLines;
      deletions += hunk.deletionLines;
    }
  }

  return {
    files: files.length,
    additions,
    deletions,
    lines: additions + deletions,
  };
}

export type DiffStats = ReturnType<typeof computeDiffStats>;

const statFormatter = new Intl.NumberFormat('en-US');

export function formatDiffStat(value: number): string {
  return statFormatter.format(value);
}
