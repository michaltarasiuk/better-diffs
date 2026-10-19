import {describe, expect, it} from 'vitest';

import {isCommentBody} from '../is-comment-body';
import {commentBody} from './bodies';

const body = commentBody('value');

function withChildren(children: unknown[]) {
  return {root: {...body.root, children}};
}

describe('isCommentBody', () => {
  it('accepts a body the editor wrote', () => {
    expect(isCommentBody(body)).toBe(true);
  });

  it.each([
    ['a body sent as a JSON string', JSON.stringify(body)],
    ['an object without a root', {}],
    ['a root without blocks', withChildren([])],
    ['a node the editor does not know', withChildren([{type: 'unknown'}])],
  ])('rejects %s', (_name, value) => {
    expect(isCommentBody(value)).toBe(false);
  });
});
