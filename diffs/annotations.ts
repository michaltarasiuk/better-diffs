import type {DiffLineAnnotation, GetHoveredLineResult} from '@pierre/diffs';
import type {SerializedEditorState} from 'lexical';

import type {ThreadState} from '@/events/state';

export interface FormAnnotationMetadata {
  readonly type: 'form';
  readonly formId: string;
  readonly draft?: SerializedEditorState;
}

export interface ThreadAnnotationMetadata {
  readonly type: 'thread';
  readonly threadId: string;
}

export type AnnotationMetadata =
  FormAnnotationMetadata | ThreadAnnotationMetadata;

export type DiffAnnotation = DiffLineAnnotation<AnnotationMetadata>;
export type FormDiffAnnotation = DiffLineAnnotation<FormAnnotationMetadata>;
export type ThreadDiffAnnotation = DiffLineAnnotation<ThreadAnnotationMetadata>;

export type DiffLine = GetHoveredLineResult<'diff'>;
export type HoveredLine = GetHoveredLineResult<'file'> | DiffLine;

export function isFormAnnotation(
  annotation: DiffAnnotation,
): annotation is FormDiffAnnotation {
  return annotation.metadata.type === 'form';
}

export function isThreadAnnotation(
  annotation: DiffAnnotation,
): annotation is ThreadDiffAnnotation {
  return annotation.metadata.type === 'thread';
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

const ANNOTATION_SIDE_ORDER = {
  deletions: 0,
  additions: 1,
} as const;

export function sortAnnotations<T extends DiffAnnotation>(
  annotations: readonly T[],
) {
  return annotations.toSorted(
    (a, b) =>
      a.lineNumber - b.lineNumber ||
      ANNOTATION_SIDE_ORDER[a.side] - ANNOTATION_SIDE_ORDER[b.side],
  );
}

export function isDiffLine(line: HoveredLine): line is DiffLine {
  return 'side' in line;
}
