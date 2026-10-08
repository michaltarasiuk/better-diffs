import {describe, expectTypeOf, it} from 'vitest';

import {isIterable} from './is-iterable';

describe('isIterable', () => {
  it('narrows values to Iterable', () => {
    expectTypeOf(isIterable).guards.toEqualTypeOf<Iterable<unknown>>();
  });
});
