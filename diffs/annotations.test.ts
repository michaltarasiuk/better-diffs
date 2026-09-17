import type {GetHoveredLineResult} from '@pierre/diffs';
import {describe, expect, expectTypeOf, it} from 'vitest';

import {assert} from '@/utils/assert';
import type {ThreadState} from '@/events/share-state';
import {FIXTURE} from '@/fixtures/fixture';
import {
  type DiffAnnotation,
  isDiffLine,
  isFormAnnotation,
  sortAnnotations,
  toThreadAnnotation,
} from './annotations';

function thread(overrides: Partial<ThreadState> = {}) {
  return {
    id: FIXTURE.thread.id,
    anchor: {
      shareId: FIXTURE.share.id,
      filePath: 'src/a.ts',
      side: 'additions',
      line: 5,
    },
    actorId: FIXTURE.actor.id,
    resolved: false,
    commentIds: [],
    createdAt: FIXTURE.time.created,
    ...overrides,
  } satisfies ThreadState;
}

function annotation(
  overrides: Partial<DiffAnnotation> & Pick<DiffAnnotation, 'metadata'>,
) {
  return {
    side: 'additions',
    lineNumber: 1,
    ...overrides,
  } satisfies DiffAnnotation;
}

describe('isFormAnnotation', () => {
  it('returns true for form metadata', () => {
    expect(
      isFormAnnotation(
        annotation({
          metadata: {type: 'form'},
          lineNumber: 2,
          side: 'deletions',
        }),
      ),
    ).toBe(true);
  });

  it('returns false for thread metadata', () => {
    expect(
      isFormAnnotation(
        annotation({
          metadata: {type: 'thread', threadId: FIXTURE.thread.id},
        }),
      ),
    ).toBe(false);
  });

  it('narrows the type when the check passes', () => {
    const value = annotation({metadata: {type: 'form'}});

    assert(isFormAnnotation(value), 'Expected form annotation');

    expectTypeOf(value.metadata).toEqualTypeOf<{readonly type: 'form'}>();
  });
});

describe('toThreadAnnotation', () => {
  it('maps thread anchor and id to a diff annotation', () => {
    expect(
      toThreadAnnotation(
        thread({
          id: FIXTURE.thread.second,
          anchor: {
            shareId: FIXTURE.share.id,
            filePath: 'src/b.ts',
            side: 'deletions',
            line: 12,
          },
        }),
      ),
    ).toEqual({
      side: 'deletions',
      lineNumber: 12,
      metadata: {type: 'thread', threadId: FIXTURE.thread.second},
    });
  });
});

describe('sortAnnotations', () => {
  it('returns an empty array for no annotations', () => {
    expect(sortAnnotations([])).toEqual([]);
  });

  it('sorts by line number ascending', () => {
    const first = annotation({
      metadata: {type: 'form'},
      lineNumber: 1,
      side: 'additions',
    });
    const second = annotation({
      metadata: {type: 'thread', threadId: FIXTURE.thread.id},
      lineNumber: 3,
      side: 'deletions',
    });
    const third = annotation({
      metadata: {type: 'form'},
      lineNumber: 2,
      side: 'additions',
    });

    expect(sortAnnotations([second, third, first])).toEqual([
      first,
      third,
      second,
    ]);
  });

  it('orders deletions before additions on the same line', () => {
    const additions = annotation({
      metadata: {type: 'form'},
      lineNumber: 4,
      side: 'additions',
    });
    const deletions = annotation({
      metadata: {type: 'thread', threadId: FIXTURE.thread.id},
      lineNumber: 4,
      side: 'deletions',
    });

    expect(sortAnnotations([additions, deletions])).toEqual([
      deletions,
      additions,
    ]);
  });

  it('does not mutate the input array', () => {
    const annotations = [
      annotation({
        metadata: {type: 'form'},
        lineNumber: 2,
        side: 'additions',
      }),
      annotation({
        metadata: {type: 'form'},
        lineNumber: 1,
        side: 'additions',
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
    side: 'additions' as DiffLine['side'],
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
    const line: HoveredLine = diffLine({side: 'deletions', lineNumber: 3});

    assert(isDiffLine(line), 'Expected diff line');

    expectTypeOf(line).toEqualTypeOf<DiffLine>();
  });
});
