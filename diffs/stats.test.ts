import {describe, expect, it} from 'vitest';

import {computeDiffStats, formatDiffStat} from './stats';

function fileDiff(
  ...hunks: readonly {additionLines: number; deletionLines: number}[]
) {
  return {hunks};
}

describe('computeDiffStats', () => {
  it('returns zeroed stats for no files', () => {
    expect(computeDiffStats([])).toEqual({
      files: 0,
      additions: 0,
      deletions: 0,
      lines: 0,
    });
  });

  it('sums every hunk across every file', () => {
    const stats = computeDiffStats([
      fileDiff(
        {additionLines: 3, deletionLines: 1},
        {additionLines: 2, deletionLines: 0},
      ),
      fileDiff({additionLines: 0, deletionLines: 4}),
    ]);

    expect(stats).toEqual({files: 2, additions: 5, deletions: 5, lines: 10});
  });

  it('counts a file that has no hunks', () => {
    expect(computeDiffStats([fileDiff()])).toMatchObject({files: 1, lines: 0});
  });
});

describe('formatDiffStat', () => {
  it('groups thousands', () => {
    expect(formatDiffStat(1234567)).toBe('1,234,567');
  });

  it('leaves small numbers alone', () => {
    expect(formatDiffStat(0)).toBe('0');
  });
});
