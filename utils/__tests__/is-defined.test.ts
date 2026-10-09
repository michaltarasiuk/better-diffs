import {describe, expect, expectTypeOf, it} from 'vitest';

import {isDefined} from '../is-defined';

describe('isDefined', () => {
  it.each([
    {name: 'null', value: null},
    {name: 'undefined', value: undefined},
  ])('returns false for $name', ({value}) => {
    expect(isDefined(value)).toBe(false);
  });

  it.each([
    {name: 'false', value: false},
    {name: 'zero', value: 0},
    {name: 'empty string', value: ''},
    {name: 'NaN', value: NaN},
  ])('returns true for falsy $name', ({value}) => {
    expect(value).toBeFalsy();
    expect(isDefined(value)).toBe(true);
  });

  it('narrows values to string', () => {
    const value: string | null | undefined = 'defined';

    expect(isDefined(value)).toBe(true);
    expectTypeOf(value).toEqualTypeOf<string>();
  });
});
