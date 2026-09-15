import type {Hunk} from '@pierre/diffs';

export interface DiffStatsFile {
  readonly hunks: readonly Pick<Hunk, 'additionLines' | 'deletionLines'>[];
}

export function computeDiffStats(fileDiffs: readonly DiffStatsFile[]) {
  let additions = 0;
  let deletions = 0;

  for (const file of fileDiffs) {
    for (const hunk of file.hunks) {
      additions += hunk.additionLines;
      deletions += hunk.deletionLines;
    }
  }

  return {
    files: fileDiffs.length,
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
