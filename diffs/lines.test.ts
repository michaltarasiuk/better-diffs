import {describe, expect, expectTypeOf, it} from 'vitest';

import {
  isDiffLine,
  type DiffLine,
  type FileLine,
  type HoveredLine,
} from './lines';

function createDiffLine(overrides: Partial<DiffLine> = {}): DiffLine {
  return {
    side: 'additions',
    lineNumber: 1,
    ...overrides,
  };
}

function createFileLine(overrides: Partial<FileLine> = {}): FileLine {
  return {
    lineNumber: 1,
    ...overrides,
  };
}

describe('isDiffLine', () => {
  it('returns true for diff hover results', () => {
    expect(isDiffLine(createDiffLine())).toBe(true);
  });

  it('returns false for file hover results', () => {
    expect(isDiffLine(createFileLine())).toBe(false);
  });

  it('narrows values to DiffLine', () => {
    const line: HoveredLine = createDiffLine({side: 'deletions'});

    if (!isDiffLine(line)) {
      throw new Error('Expected diff line');
    }

    expect(line.side).toBe('deletions');
    expectTypeOf(line).toEqualTypeOf<DiffLine>();
  });
});
