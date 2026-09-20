import type {DiffLineAnnotation, GetHoveredLineResult} from '@pierre/diffs';

import type {ThreadState} from '@/events/share-state';
import type {AnnotationMetadata, FormAnnotationMetadata} from './options';

export type DiffAnnotation = DiffLineAnnotation<AnnotationMetadata>;
export type FormDiffAnnotation = DiffLineAnnotation<FormAnnotationMetadata>;

const ANNOTATION_SIDE_ORDER = {
  deletions: 0,
  additions: 1,
} as const;

export function isFormAnnotation(
  annotation: DiffAnnotation,
): annotation is FormDiffAnnotation {
  return annotation.metadata.type === 'form';
}

export function toThreadAnnotation(thread: ThreadState): DiffAnnotation {
  return {
    side: thread.anchor.side,
    lineNumber: thread.anchor.line,
    metadata: {
      type: 'thread',
      threadId: thread.id,
    },
  };
}

export function sortAnnotations<T extends DiffAnnotation>(
  annotations: readonly T[],
) {
  return annotations.toSorted(
    (a, b) =>
      a.lineNumber - b.lineNumber ||
      ANNOTATION_SIDE_ORDER[a.side] - ANNOTATION_SIDE_ORDER[b.side],
  );
}

type DiffLine = GetHoveredLineResult<'diff'>;
type HoveredLine = GetHoveredLineResult<'file'> | DiffLine;

export function isDiffLine(line: HoveredLine): line is DiffLine {
  return 'side' in line;
}
