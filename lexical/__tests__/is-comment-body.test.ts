import {describe, expect, it} from 'vitest';

import {isCommentBody} from '../is-comment-body';
import {commentBody} from './bodies';

describe('isCommentBody', () => {
  it('accepts a body the editor wrote', () => {
    expect(isCommentBody(commentBody('hello'))).toBe(true);
  });

  it('rejects a body without content', () => {
    const body = commentBody('hello');

    expect(isCommentBody({root: {...body.root, children: []}})).toBe(false);
  });

  it('rejects a node the editor does not know', () => {
    const body = commentBody('hello');

    expect(
      isCommentBody({
        root: {...body.root, children: [{type: 'unknown', version: 1}]},
      }),
    ).toBe(false);
  });

  it.each([
    ['nothing', undefined],
    ['a number', 1],
    ['a string', JSON.stringify(commentBody('hello'))],
    ['an object without a root', {}],
  ])('rejects %s', (_name, value) => {
    expect(isCommentBody(value)).toBe(false);
  });
});
