import {describe, expect, expectTypeOf, it} from 'vitest';

import {assert} from './assert';
import {isDefined} from './defined';

describe('isDefined', () => {
  it.each([0, -0, NaN, '', false, [], {}])('accepts %o', (value) => {
    expect(isDefined(value)).toBe(true);
  });

  it.each([null, undefined])('rejects %o', (value) => {
    expect(isDefined(value)).toBe(false);
  });

  it('treats a defined value as non-nullish', () => {
    const value: string | null | undefined = 'value';

    assert(isDefined(value), 'Expected value to be defined');

    expectTypeOf(value).toEqualTypeOf<string>();
    expect(value).toBe('value');
  });
});
