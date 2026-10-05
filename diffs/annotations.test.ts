import {describe, expect, expectTypeOf, it} from 'vitest';

import type {ThreadState} from '@/events/state';
import {createActor, createAnchor, CREATED_AT} from '@/testing/events';
import {uuid} from '@/testing/uuid';

import {
  type DiffAnnotation,
  type FormAnnotationMetadata,
  type FormDiffAnnotation,
  isFormAnnotation,
  isThreadAnnotation,
  sortAnnotations,
  type ThreadAnnotationMetadata,
  type ThreadDiffAnnotation,
  toThreadAnnotation,
} from './annotations';

type AnnotationPosition = Partial<Pick<DiffAnnotation, 'side' | 'lineNumber'>>;

function createFormAnnotation(
  position: AnnotationPosition = {},
): FormDiffAnnotation {
  return {
    side: 'additions',
    lineNumber: 1,
    metadata: {
      type: 'form',
      formId: uuid(),
    },
    ...position,
  };
}

function createThreadAnnotation(
  position: AnnotationPosition = {},
): ThreadDiffAnnotation {
  return {
    side: 'additions',
    lineNumber: 1,
    metadata: {
      type: 'thread',
      threadId: uuid(),
    },
    ...position,
  };
}

describe('isFormAnnotation', () => {
  it('returns true for form metadata', () => {
    expect(isFormAnnotation(createFormAnnotation())).toBe(true);
  });

  it('returns false for thread metadata', () => {
    expect(isFormAnnotation(createThreadAnnotation())).toBe(false);
  });

  it('narrows the type when the check passes', () => {
    const value: DiffAnnotation = createFormAnnotation();

    if (!isFormAnnotation(value)) {
      throw new Error('Expected form annotation');
    }

    expect(value.metadata.type).toBe('form');
    expectTypeOf(value.metadata).toEqualTypeOf<FormAnnotationMetadata>();
  });
});

describe('isThreadAnnotation', () => {
  it('returns true for thread metadata', () => {
    expect(isThreadAnnotation(createThreadAnnotation())).toBe(true);
  });

  it('returns false for form metadata', () => {
    expect(isThreadAnnotation(createFormAnnotation())).toBe(false);
  });

  it('narrows the type when the check passes', () => {
    const value: DiffAnnotation = createThreadAnnotation();

    if (!isThreadAnnotation(value)) {
      throw new Error('Expected thread annotation');
    }

    expect(value.metadata.type).toBe('thread');
    expectTypeOf(value.metadata).toEqualTypeOf<ThreadAnnotationMetadata>();
  });
});

describe('toThreadAnnotation', () => {
  it('maps thread anchor and id to a diff annotation', () => {
    const thread: ThreadState = {
      id: uuid(),
      anchor: createAnchor({side: 'deletions', line: 12}),
      actorId: uuid(),
      actor: createActor(),
      resolved: false,
      commentIds: [],
      createdAt: CREATED_AT,
    };

    const annotation = toThreadAnnotation(thread);

    expect(annotation).toEqual({
      side: 'deletions',
      lineNumber: 12,
      metadata: {
        type: 'thread',
        threadId: thread.id,
      },
    });
    expectTypeOf(annotation).toEqualTypeOf<ThreadDiffAnnotation>();
  });
});

describe('sortAnnotations', () => {
  it('returns an empty array for no annotations', () => {
    expect(sortAnnotations([])).toEqual([]);
  });

  it('sorts by line number ascending', () => {
    const first = createFormAnnotation({lineNumber: 1});
    const second = createThreadAnnotation({
      side: 'deletions',
      lineNumber: 3,
    });
    const third = createFormAnnotation({lineNumber: 2});

    expect(sortAnnotations([second, third, first])).toEqual([
      first,
      third,
      second,
    ]);
  });

  it('orders deletions before additions on the same line', () => {
    const additions = createFormAnnotation({lineNumber: 4});
    const deletions = createThreadAnnotation({
      side: 'deletions',
      lineNumber: 4,
    });

    expect(sortAnnotations([additions, deletions])).toEqual([
      deletions,
      additions,
    ]);
  });

  it('does not mutate the input array', () => {
    const annotations = [
      createFormAnnotation({lineNumber: 2}),
      createFormAnnotation({lineNumber: 1}),
    ];

    expect(sortAnnotations(annotations)).not.toBe(annotations);
    expect(annotations.map(({lineNumber}) => lineNumber)).toEqual([2, 1]);
  });
});
