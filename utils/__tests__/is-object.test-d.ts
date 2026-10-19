import {describe, expectTypeOf, it} from 'vitest';

import {isObject} from '../is-object';

describe('isObject', () => {
  it('narrows values to object', () => {
    expectTypeOf(isObject).guards.toEqualTypeOf<object>();
  });
});
