import {describe, expect, it} from 'vitest';

import {isObject} from '../is-object';

describe('isObject', () => {
  it.each([
    ['a plain object', {}],
    ['an array', []],
  ])('returns true for %s', (_name, value) => {
    expect(isObject(value)).toBe(true);
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 1],
    ['a string', '{}'],
  ])('returns false for %s', (_name, value) => {
    expect(isObject(value)).toBe(false);
  });
});
