import type {GetHoveredLineResult} from '@pierre/diffs';
import {describe, expect, expectTypeOf, it} from 'vitest';

import {createThreadState} from '@/testing/factories/events';
import {FORM_ID, SHARE_ID, THREAD_ID, THREAD_ID_SECONDARY} from '@/testing/ids';
import {
  type DiffAnnotation,
  type FormAnnotationMetadata,
  isDiffLine,
  isFormAnnotation,
  sortAnnotations,
  toThreadAnnotation,
} from './annotations';

function annotation(
  overrides: Partial<DiffAnnotation> & Pick<DiffAnnotation, 'metadata'>,
): DiffAnnotation {
  return {
    side: 'additions',
    lineNumber: 1,
    ...overrides,
  };
}

describe('isFormAnnotation', () => {
  it('returns true for form metadata', () => {
    expect(
      isFormAnnotation(
        annotation({
          side: 'deletions',
          lineNumber: 2,
          metadata: {type: 'form', formId: FORM_ID},
        }),
      ),
    ).toBe(true);
  });

  it('returns false for thread metadata', () => {
    expect(
      isFormAnnotation(
        annotation({
          metadata: {
            type: 'thread',
            threadId: THREAD_ID,
          },
        }),
      ),
    ).toBe(false);
  });

  it('narrows the type when the check passes', () => {
    const value = annotation({metadata: {type: 'form', formId: FORM_ID}});

    if (!isFormAnnotation(value)) {
      throw new Error('Expected form annotation');
    }

    expect(value.metadata.type).toBe('form');
    expectTypeOf(value.metadata).toEqualTypeOf<FormAnnotationMetadata>();
  });
});

describe('toThreadAnnotation', () => {
  it('maps thread anchor and id to a diff annotation', () => {
    expect(
      toThreadAnnotation(
        createThreadState({
          id: THREAD_ID_SECONDARY,
          anchor: {
            shareId: SHARE_ID,
            filePath: 'b.txt',
            side: 'deletions',
            line: 12,
          },
        }),
      ),
    ).toEqual({
      side: 'deletions',
      lineNumber: 12,
      metadata: {
        type: 'thread',
        threadId: THREAD_ID_SECONDARY,
      },
    });
  });
});

describe('sortAnnotations', () => {
  it('returns an empty array for no annotations', () => {
    expect(sortAnnotations([])).toEqual([]);
  });

  it('sorts by line number ascending', () => {
    const first = annotation({
      side: 'additions',
      lineNumber: 1,
      metadata: {type: 'form', formId: FORM_ID},
    });
    const second = annotation({
      side: 'deletions',
      lineNumber: 3,
      metadata: {
        type: 'thread',
        threadId: THREAD_ID,
      },
    });
    const third = annotation({
      side: 'additions',
      lineNumber: 2,
      metadata: {type: 'form', formId: FORM_ID},
    });

    expect(sortAnnotations([second, third, first])).toEqual([
      first,
      third,
      second,
    ]);
  });

  it('orders deletions before additions on the same line', () => {
    const additions = annotation({
      side: 'additions',
      lineNumber: 4,
      metadata: {type: 'form', formId: FORM_ID},
    });
    const deletions = annotation({
      side: 'deletions',
      lineNumber: 4,
      metadata: {
        type: 'thread',
        threadId: THREAD_ID,
      },
    });

    expect(sortAnnotations([additions, deletions])).toEqual([
      deletions,
      additions,
    ]);
  });

  it('does not mutate the input array', () => {
    const annotations = [
      annotation({
        side: 'additions',
        lineNumber: 2,
        metadata: {type: 'form', formId: FORM_ID},
      }),
      annotation({
        side: 'additions',
        lineNumber: 1,
        metadata: {type: 'form', formId: FORM_ID},
      }),
    ];

    expect(sortAnnotations(annotations)).not.toBe(annotations);
    expect(annotations[0]?.lineNumber).toBe(2);
  });
});

type DiffLine = GetHoveredLineResult<'diff'>;
type FileLine = GetHoveredLineResult<'file'>;
type HoveredLine = FileLine | DiffLine;

function diffLine(overrides: Partial<DiffLine> = {}) {
  return {
    side: 'additions',
    lineNumber: 1,
    ...overrides,
  } satisfies DiffLine;
}

function fileLine(overrides: Partial<FileLine> = {}) {
  return {
    lineNumber: 1,
    ...overrides,
  } satisfies FileLine;
}

describe('isDiffLine', () => {
  it('returns true for diff hover results', () => {
    expect(isDiffLine(diffLine({lineNumber: 7}))).toBe(true);
  });

  it('returns false for file hover results', () => {
    expect(isDiffLine(fileLine({lineNumber: 7}))).toBe(false);
  });

  it('narrows the type when the check passes', () => {
    const line: HoveredLine = diffLine({
      side: 'deletions',
      lineNumber: 3,
    });

    if (!isDiffLine(line)) {
      throw new Error('Expected diff line');
    }

    expect(line.side).toBe('deletions');
    expectTypeOf(line).toEqualTypeOf<DiffLine>();
  });
});
