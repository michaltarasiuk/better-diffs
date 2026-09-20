// @vitest-environment jsdom

import {describe, expect, it} from 'vitest';

import {isEditableTarget} from './is-editable-target';

describe('isEditableTarget', () => {
  it.each([
    {name: 'null', target: null},
    {name: 'a non-element EventTarget', target: new EventTarget()},
    {name: 'a text node', target: document.createTextNode('text')},
  ])('rejects $name', ({target}) => {
    expect(isEditableTarget(target)).toBe(false);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT'] as const)(
    'accepts a %s element',
    (tagName) => {
      expect(isEditableTarget(document.createElement(tagName))).toBe(true);
    },
  );

  it('accepts a contenteditable element', () => {
    const element = document.createElement('div');
    /* jsdom does not implement HTMLElement.isContentEditable */
    Object.defineProperty(element, 'isContentEditable', {value: true});

    expect(isEditableTarget(element)).toBe(true);
  });

  it.each(['div', 'button', 'a', 'span'] as const)(
    'rejects a non-editable %s',
    (tagName) => {
      expect(isEditableTarget(document.createElement(tagName))).toBe(false);
    },
  );
});
