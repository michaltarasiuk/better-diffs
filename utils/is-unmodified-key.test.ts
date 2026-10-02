// @vitest-environment jsdom

import {describe, expect, it} from 'vitest';

import {isUnmodifiedKey} from './is-unmodified-key';

describe('isUnmodifiedKey', () => {
  it('accepts the key without modifiers', () => {
    const event = new KeyboardEvent('keydown', {key: 'j'});

    expect(isUnmodifiedKey(event, 'j')).toBe(true);
  });

  it('rejects a different key', () => {
    const event = new KeyboardEvent('keydown', {key: 'k'});

    expect(isUnmodifiedKey(event, 'j')).toBe(false);
  });

  it.each(['metaKey', 'ctrlKey', 'altKey', 'shiftKey'] as const)(
    'rejects the key with %s held',
    (modifier) => {
      const event = new KeyboardEvent('keydown', {key: 'j', [modifier]: true});

      expect(isUnmodifiedKey(event, 'j')).toBe(false);
    },
  );
});
