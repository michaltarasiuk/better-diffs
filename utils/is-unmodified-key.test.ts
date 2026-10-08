// @vitest-environment jsdom

import {describe, expect, it} from 'vitest';

import {isUnmodifiedKey} from './is-unmodified-key';

describe('isUnmodifiedKey', () => {
  it('returns true when Escape key is pressed without modifiers', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    });

    expect(isUnmodifiedKey(event, 'Escape')).toBe(true);
  });

  it('returns false for different key', () => {
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
    });

    expect(isUnmodifiedKey(event, 'Enter')).toBe(false);
  });

  it.each(['metaKey', 'ctrlKey', 'altKey', 'shiftKey'] as const)(
    'returns false for Escape key if %s is held',
    (modifier) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        [modifier]: true,
      });

      expect(isUnmodifiedKey(event, 'Escape')).toBe(false);
    },
  );
});
