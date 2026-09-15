import {describe, expect, expectTypeOf, it} from 'vitest';

import {assert} from './assert';
import {isDefined} from './defined';

describe('assert', () => {
  it('does not throw when the condition is true', () => {
    expect(() => assert(true, 'Unreachable')).not.toThrow();
  });

  it('throws with the given message when the condition is false', () => {
    expect(() => assert(false, 'Share not found')).toThrow('Share not found');
  });

  it('narrows the type when the condition passes', () => {
    const value: string | null = 'value';

    assert(isDefined(value), 'Value missing');

    expectTypeOf(value).toEqualTypeOf<string>();
  });
});
