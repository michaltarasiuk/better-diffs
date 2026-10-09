import {describe, expect, it} from 'vitest';

import {computeDiffStats, type DiffStatsFile, formatDiffStat} from '../stats';

type DiffStatsHunk = DiffStatsFile['hunks'][number];

function hunk(additionLines: number, deletionLines: number): DiffStatsHunk {
  return {additionLines, deletionLines};
}

function file(...hunks: DiffStatsHunk[]): DiffStatsFile {
  return {hunks};
}

describe('computeDiffStats', () => {
  it('returns zeros for no files', () => {
    expect(computeDiffStats([])).toEqual({
      files: 0,
      additions: 0,
      deletions: 0,
      lines: 0,
    });
  });

  it('sums lines across files and hunks', () => {
    const stats = computeDiffStats([
      file(hunk(3, 1), hunk(2, 0)),
      file(),
      file(hunk(0, 4)),
    ]);

    expect(stats).toEqual({files: 3, additions: 5, deletions: 5, lines: 10});
  });
});

describe('formatDiffStat', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1234, '1,234'],
    [1234567, '1,234,567'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatDiffStat(value)).toBe(expected);
  });
});
