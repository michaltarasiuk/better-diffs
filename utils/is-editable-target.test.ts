// @vitest-environment jsdom

import {describe, expect, it} from 'vitest';

import {isEditableTarget} from './is-editable-target';

describe('isEditableTarget', () => {
  it('returns false for a non-element EventTarget', () => {
    expect(isEditableTarget(new EventTarget())).toBe(false);
  });

  it.each(['div', 'button'] as const)(
    'returns false for a non-editable %s',
    (tag) => {
      const element = document.createElement(tag);
      expect(isEditableTarget(element)).toBe(false);
    },
  );

  it('returns true for a content-editable element', () => {
    const element = document.createElement('div');
    // jsdom does not implement HTMLElement#isContentEditable
    Object.defineProperty(element, 'isContentEditable', {value: true});

    expect(isEditableTarget(element)).toBe(true);
  });

  it.each(['input', 'textarea', 'select'] as const)(
    'returns true for %s',
    (tag) => {
      const element = document.createElement(tag);
      expect(isEditableTarget(element)).toBe(true);
    },
  );
});
