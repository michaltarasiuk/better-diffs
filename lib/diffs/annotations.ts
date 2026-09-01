import type {AnnotationMetadata} from './options';
import type {
  DiffLineAnnotation,
  GetHoveredLineResult,
  LineAnnotation,
} from '@pierre/diffs';

export type DiffAnnotation = DiffLineAnnotation<AnnotationMetadata>;

/** Pierre types file and diff annotations as a union; diff annotations have `side`. */
export function isDiffAnnotation(
  annotation:
    LineAnnotation<AnnotationMetadata> | DiffLineAnnotation<AnnotationMetadata>,
): annotation is DiffAnnotation {
  return 'side' in annotation;
}

/** Pierre types file and diff hover targets as a union; diff lines have `side`. */
export function isDiffHoveredLine(
  line: GetHoveredLineResult<'file'> | GetHoveredLineResult<'diff'>,
): line is GetHoveredLineResult<'diff'> {
  return 'side' in line;
}
