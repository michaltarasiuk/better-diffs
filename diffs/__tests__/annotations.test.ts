import {describe, expect, it} from 'vitest';

import type {Thread} from '#/threads/schemas';
import {newId} from '#/utils/new-id';

import {
  sortAnnotations,
  toThreadAnnotation,
  type DiffAnnotation,
  type FormDiffAnnotation,
  type ThreadDiffAnnotation,
} from '../annotations';

const FORM_ID = newId();
const THREAD_ID = newId();

const FORM = {
  side: 'additions',
  lineNumber: 1,
  metadata: {type: 'form', formId: FORM_ID},
} satisfies FormDiffAnnotation;

const THREAD = {
  side: 'additions',
  lineNumber: 1,
  metadata: {type: 'thread', threadId: THREAD_ID},
} satisfies ThreadDiffAnnotation;

function at(lineNumber: number, side: DiffAnnotation['side']): DiffAnnotation {
  return {...THREAD, lineNumber, side};
}

describe('toThreadAnnotation', () => {
  it('anchors the annotation at the thread line', () => {
    const thread = {
      id: THREAD_ID,
      anchor: {
        fileId: newId(),
        side: 'deletions',
        line: 7,
      },
    } as Thread;

    expect(toThreadAnnotation(thread)).toEqual({
      side: 'deletions',
      lineNumber: 7,
      metadata: {type: 'thread', threadId: THREAD_ID},
    });
  });
});

describe('sortAnnotations', () => {
  it('sorts by line, then deletions before additions', () => {
    const annotations = [
      at(5, 'additions'),
      at(2, 'additions'),
      at(5, 'deletions'),
      at(2, 'deletions'),
    ];

    expect(sortAnnotations(annotations)).toEqual([
      at(2, 'deletions'),
      at(2, 'additions'),
      at(5, 'deletions'),
      at(5, 'additions'),
    ]);
  });

  it('keeps the input untouched and preserves ties', () => {
    const first = {...FORM, lineNumber: 3};
    const second = {...THREAD, lineNumber: 3};
    const annotations = [first, second];

    const sorted = sortAnnotations(annotations);

    expect(sorted).not.toBe(annotations);
    expect(sorted[0]).toBe(first);
    expect(sorted[1]).toBe(second);
  });
});
