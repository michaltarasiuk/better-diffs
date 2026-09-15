import {describe, expect, expectTypeOf, it} from 'vitest';

import {assert} from './assert';
import {isIterable} from './iterable';

describe('isIterable', () => {
  it.each([
    {name: 'a string', value: ''},
    {name: 'an array', value: []},
    {name: 'a Map', value: new Map()},
    {name: 'a Set', value: new Set()},
    {name: 'a generator', value: (function* () {})()},
    {name: 'a hand-rolled iterable', value: {*[Symbol.iterator]() {}}},
  ])('accepts $name', ({value}) => {
    expect(isIterable(value)).toBe(true);
  });

  it.each([
    {name: 'a plain object', value: {}},
    {name: 'an array-like object', value: {length: 1, 0: null}},
    {name: 'a non-callable iterator key', value: {[Symbol.iterator]: null}},
    {name: 'null', value: null},
    {name: 'undefined', value: undefined},
    {name: 'a number', value: 0},
  ])('rejects $name', ({value}) => {
    expect(isIterable(value)).toBe(false);
  });

  it('treats a passing check as iterable', () => {
    const value: unknown = [];

    assert(isIterable(value), 'Expected value to be iterable');

    expectTypeOf(value).toEqualTypeOf<Iterable<unknown>>();
    expect(value).toEqual([]);
  });
});
