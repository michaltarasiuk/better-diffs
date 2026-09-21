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
    {name: 'zero', value: 0},
    {name: 'empty string', value: ''},
    {name: 'false', value: false},
    {name: 'empty object', value: {}},
  ])('accepts $name', ({value}) => {
    expect(isDefined(value)).toBe(true);
  });

  it('narrows the type when the check passes', () => {
    const value: string | null | undefined = 'value';

    if (!isDefined(value)) {
      throw new Error('Expected value to be defined');
    }

    expect(value).toBe('value');
    expectTypeOf(value).toEqualTypeOf<string>();
  });
});
