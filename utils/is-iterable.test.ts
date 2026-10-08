import {describe, expect, it} from 'vitest';

import {isIterable} from './is-iterable';

function createIterableObject() {
  const iterable: Iterable<unknown> = {
    [Symbol.iterator]() {
      const iterator = {
        next() {
          return {done: true, value: undefined};
        },
      };

      return iterator;
    },
  };

  return iterable;
}

describe('isIterable', () => {
  it('returns true for an iterable object', () => {
    expect(isIterable(createIterableObject())).toBe(true);
  });

  it('returns false for a plain object', () => {
    expect(isIterable({})).toBe(false);
  });
});
