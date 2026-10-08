import {describe, expect, expectTypeOf, it} from 'vitest';

import {isDefined} from './is-defined';

describe('isDefined', () => {
  it.each([
    {name: 'null', value: null},
    {name: 'undefined', value: undefined},
  ])('rejects $name', ({value}) => {
    expect(isDefined(value)).toBe(false);
  });

  it.each([
    {name: 'false', value: false},
    {name: 'zero', value: 0},
    {name: 'empty string', value: ''},
    {name: 'NaN', value: NaN},
  ])('accepts falsy $name', ({value}) => {
    expect(value).toBeFalsy();
    expect(isDefined(value)).toBe(true);
  });

  it('narrows string when the check passes', () => {
    const value: string | null | undefined = 'hello';

    expect(isDefined(value)).toBe(true);
    expect(value).toBe('hello');
    expectTypeOf(value).toEqualTypeOf<string>();
  });
});
