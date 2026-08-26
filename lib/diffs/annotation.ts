import {z} from 'zod';

import type {DiffLineAnnotation, SelectionSide} from '@pierre/diffs';

type AnnotationOf<T extends string> = DiffLineAnnotation<{
  readonly type: T;
}>;

export type FormAnnotation = AnnotationOf<'form'>;
export type ThreadAnnotation = AnnotationOf<'thread'>;
export type LineAnnotation = AnnotationOf<'form' | 'thread'>;

export type AnnotationMetadata = LineAnnotation['metadata'];

const SelectionSideSchema = z.enum([
  'deletions',
  'additions',
]) satisfies z.ZodType<SelectionSide>;

export const FormLocationSchema = z.object({
  file: z.string(),
  lineNumber: z.int(),
  side: SelectionSideSchema,
});

export type FormLocation = z.infer<typeof FormLocationSchema>;

export const FormLocationsSchema = z.array(FormLocationSchema);

export function toFormAnnotation(a: FormLocation): FormAnnotation {
  return {
    lineNumber: a.lineNumber,
    side: a.side,
    metadata: {type: 'form'},
  };
}
