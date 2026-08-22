import {parseAsJson} from 'nuqs/server';
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

export const FormAnnotationLocationSchema = z.object({
  file: z.string(),
  lineNumber: z.int(),
  side: SelectionSideSchema,
});

export type FormAnnotationLocation = z.infer<
  typeof FormAnnotationLocationSchema
>;

export const FormAnnotationLocationsSchema = z.array(
  FormAnnotationLocationSchema,
);

export const parseAsFormAnnotations = parseAsJson(
  FormAnnotationLocationsSchema,
).withDefault([]);

export function toFormAnnotation(a: FormAnnotationLocation): FormAnnotation {
  return {
    lineNumber: a.lineNumber,
    side: a.side,
    metadata: {type: 'form'},
  };
}
