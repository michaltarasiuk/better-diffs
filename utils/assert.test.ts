import {describe, expect, expectTypeOf, it} from 'vitest';

import {assert} from './assert';
import {isDefined} from './defined';

describe('assert', () => {
  it('returns when the condition is true', () => {
    assert(true, 'Unreachable');
  });

  it('throws with the given message when the condition is false', () => {
    expect(() => assert(false, 'Share not found')).toThrow('Share not found');
  });

  it('narrows the asserted value', () => {
    const value: string | null = 'value';

    assert(isDefined(value), 'Value missing');

    expectTypeOf(value).toEqualTypeOf<string>();
    expect(value).toBe('value');
  });
});
