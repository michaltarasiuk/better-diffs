import type {GetHoveredLineResult} from '@pierre/diffs';

export type DiffLine = GetHoveredLineResult<'diff'>;
export type FileLine = GetHoveredLineResult<'file'>;
export type HoveredLine = DiffLine | FileLine;

export function isDiffLine(line: HoveredLine): line is DiffLine {
  return 'side' in line;
}
