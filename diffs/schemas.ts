import type * as Diffs from '@pierre/diffs';
import {z} from 'zod';

export const AnnotationSide = z.enum([
  'deletions',
  'additions',
]) satisfies z.ZodType<Diffs.AnnotationSide>;

const SelectionSide = z.enum([
  'deletions',
  'additions',
]) satisfies z.ZodType<Diffs.SelectionSide>;

const SelectedLineRange = z.object({
  start: z.int().positive(),
  end: z.int().positive(),
  side: SelectionSide.optional(),
  endSide: SelectionSide.optional(),
}) satisfies z.ZodType<Diffs.SelectedLineRange>;

export const SelectedLines = z.object({
  id: z.string(),
  range: SelectedLineRange,
});
export type SelectedLines = z.infer<typeof SelectedLines>;
