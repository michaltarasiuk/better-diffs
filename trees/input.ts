import type {FileDiffMetadata} from '@pierre/diffs';
import type {GitStatus} from '@pierre/trees';
import {prepareFileTreeInput} from '@pierre/trees';

export type TreeInputFile = Pick<FileDiffMetadata, 'name' | 'type'>;
export type TreeInput = ReturnType<typeof prepareTreeInput>;

export function prepareTreeInput(files: readonly TreeInputFile[]) {
  const {paths} = prepareFileTreeInput(
    files.map(({name}) => name),
    {flattenEmptyDirectories: true},
  );

  const gitStatus = files.map(({name, type}) => ({
    path: name,
    status: toGitStatus(type),
  }));

  return {paths, gitStatus};
}

export function sortByTree<T extends {readonly name: string}>(
  files: readonly T[],
  {paths}: TreeInput,
) {
  const rankByPath = new Map(paths.map((path, rank) => [path, rank]));
  const rankOf = ({name}: T) => rankByPath.get(name) ?? Number.MAX_SAFE_INTEGER;

  return files.toSorted((a, b) => rankOf(a) - rankOf(b));
}

function toGitStatus(type: FileDiffMetadata['type']): GitStatus {
  switch (type) {
    case 'new':
      return 'added';
    case 'deleted':
      return 'deleted';
    case 'change':
      return 'modified';
    case 'rename-pure':
    case 'rename-changed':
      return 'renamed';
    default:
      return type satisfies never;
  }
}
