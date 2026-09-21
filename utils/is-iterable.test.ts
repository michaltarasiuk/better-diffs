import {describe, expect, expectTypeOf, it} from 'vitest';

import {isIterable} from './is-iterable';

describe('isIterable', () => {
  it.each([
    {name: 'an array', value: []},
    {name: 'a string array', value: ['text/html']},
    {name: 'a Map', value: new Map()},
    {name: 'a Set', value: new Set()},
  ])('accepts $name', ({value}) => {
    expect(isIterable(value)).toBe(true);
  });

  it.each([
    {name: 'null', value: null},
    {name: 'undefined', value: undefined},
    {name: 'a plain object', value: {}},
    {name: 'a record', value: {'text/html': 1}},
  ])('rejects $name', ({value}) => {
    expect(isIterable(value)).toBe(false);
  });

  it('narrows the type when the check passes', () => {
    const value: unknown = [];

    if (!isIterable(value)) {
      throw new Error('Expected value to be iterable');
    }

    expect([...value]).toEqual([]);
    expectTypeOf(value).toEqualTypeOf<Iterable<unknown>>();
  });
});
