import {z} from 'zod';

export const SelectionSide = z.enum(['deletions', 'additions']);
export type SelectionSide = z.infer<typeof SelectionSide>;

const SelectedLineRange = z.object({
  start: z.number(),
  end: z.number(),
  side: SelectionSide.optional(),
  endSide: SelectionSide.optional(),
});
export type SelectedLineRange = z.infer<typeof SelectedLineRange>;

export const SelectedLines = z.object({
  id: z.string(),
  range: SelectedLineRange,
});
export type SelectedLines = z.infer<typeof SelectedLines>;
