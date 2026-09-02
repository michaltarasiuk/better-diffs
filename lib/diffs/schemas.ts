import {z} from 'zod';

export const SelectionSide = z.enum(['deletions', 'additions']);

export const SelectedLineRange = z.object({
  start: z.number(),
  end: z.number(),
  side: SelectionSide.optional(),
  endSide: SelectionSide.optional(),
});

export const SelectedLines = z.object({
  id: z.string(),
  range: SelectedLineRange,
});
