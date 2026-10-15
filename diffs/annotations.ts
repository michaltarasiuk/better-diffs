import type {AnnotationSide, DiffLineAnnotation} from '@pierre/diffs';

import type {Thread} from '#/threads/schemas';

export interface FormAnnotationMetadata {
  readonly type: 'form';
  readonly formId: string;
}

interface ThreadAnnotationMetadata {
  readonly type: 'thread';
  readonly threadId: string;
}

export type AnnotationMetadata =
  FormAnnotationMetadata | ThreadAnnotationMetadata;

export type DiffAnnotation = DiffLineAnnotation<AnnotationMetadata>;
export type FormDiffAnnotation = DiffLineAnnotation<FormAnnotationMetadata>;
export type ThreadDiffAnnotation = DiffLineAnnotation<ThreadAnnotationMetadata>;

export function toThreadAnnotation(thread: Thread): ThreadDiffAnnotation {
  return {
    side: thread.anchor.side,
    lineNumber: thread.anchor.line,
    metadata: {
      type: 'thread',
      threadId: thread.id,
    },
  };
}

const SIDE_ORDER = {
  deletions: 0,
  additions: 1,
} as const satisfies Record<AnnotationSide, number>;

export function sortAnnotations<T extends DiffAnnotation>(
  annotations: readonly T[],
) {
  return annotations.toSorted(
    (a, b) =>
      a.lineNumber - b.lineNumber || SIDE_ORDER[a.side] - SIDE_ORDER[b.side],
  );
}
