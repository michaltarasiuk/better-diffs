import {describe, expect, it} from 'vitest';

import {isDiffLine, type DiffLine, type FileLine} from '../lines';

describe('isDiffLine', () => {
  it('distinguishes diff lines from file lines by side', () => {
    expect(isDiffLine({lineNumber: 1, side: 'additions'} as DiffLine)).toBe(
      true,
    );
    expect(isDiffLine({lineNumber: 1} as FileLine)).toBe(false);
  });
});
