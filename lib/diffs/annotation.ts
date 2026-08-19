import type {DiffLineAnnotation, SelectionSide} from '@pierre/diffs';

import {parseAsJson} from 'nuqs/server';
import {z} from 'zod';

export interface AnnotationMetadata {
  readonly type: 'form' | 'thread';
}

export type LineAnnotation = DiffLineAnnotation<AnnotationMetadata>;

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
