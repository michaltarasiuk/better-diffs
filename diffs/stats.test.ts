import {describe, expect, it} from 'vitest';

import {computeDiffStats, type DiffStatsFile, formatDiffStat} from './stats';

function fileDiff(...hunks: DiffStatsFile['hunks'][number][]) {
  return {hunks} satisfies DiffStatsFile;
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
    expect(
      computeDiffStats([
        fileDiff(
          {additionLines: 3, deletionLines: 1},
          {additionLines: 2, deletionLines: 0},
        ),
        fileDiff({additionLines: 0, deletionLines: 4}),
      ]),
    ).toEqual({files: 2, additions: 5, deletions: 5, lines: 10});
  });

  it('counts a file with no hunks and reports zero line changes', () => {
    expect(computeDiffStats([fileDiff()])).toEqual({
      files: 1,
      additions: 0,
      deletions: 0,
      lines: 0,
    });
  });
});

describe('formatDiffStat', () => {
  it.each([
    {value: 0, expected: '0'},
    {value: 1234567, expected: '1,234,567'},
  ])('formats $value as $expected', ({value, expected}) => {
    expect(formatDiffStat(value)).toBe(expected);
  });
});
