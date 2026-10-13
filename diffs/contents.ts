import type {FileContents} from '@pierre/diffs';

export function fileContents(
  name: string,
  ...lines: readonly string[]
): FileContents {
  return {
    name,
    contents: lines.map((line) => `${line}\n`).join(''),
  };
}
