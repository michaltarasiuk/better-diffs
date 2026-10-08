// @vitest-environment jsdom

import {describe, expect, it} from 'vitest';

import {isEditableTarget} from './is-editable-target';

describe('isEditableTarget', () => {
  it('rejects a non-element EventTarget', () => {
    expect(isEditableTarget(new EventTarget())).toBe(false);
  });

  it.each(['div', 'button'] as const)('rejects a non-editable %s', (tag) => {
    expect(isEditableTarget(document.createElement(tag))).toBe(false);
  });

  it('accepts a content-editable element', () => {
    const element = document.createElement('div');
    // jsdom does not implement HTMLElement#isContentEditable
    Object.defineProperty(element, 'isContentEditable', {value: true});

    expect(isEditableTarget(element)).toBe(true);
  });

  it.each(['input', 'textarea', 'select'] as const)('accepts %s', (tag) => {
    expect(isEditableTarget(document.createElement(tag))).toBe(true);
  });
});
