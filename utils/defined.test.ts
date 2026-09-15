import {describe, expect, expectTypeOf, it} from 'vitest';

import {isDefined} from './defined';

describe('isDefined', () => {
  it.each([0, -0, NaN, '', false, [], {}])('accepts %o', (value) => {
    expect(isDefined(value)).toBe(true);
  });

  it.each([null, undefined])('rejects %o', (value) => {
    expect(isDefined(value)).toBe(false);
  });

  it('narrows away null and undefined', () => {
    const value: string | null | undefined = 'value';

    if (isDefined(value)) {
      expectTypeOf(value).toEqualTypeOf<string>();
      expect(value).toBe('value');
    }
  });
});
