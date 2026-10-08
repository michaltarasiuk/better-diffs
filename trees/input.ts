import type {FileDiffMetadata} from '@pierre/diffs';
import {prepareFileTreeInput, type GitStatus} from '@pierre/trees';

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
  const indexByPath = new Map(paths.map((path, index) => [path, index]));
  const indexOf = ({name}: T) =>
    indexByPath.get(name) ?? Number.MAX_SAFE_INTEGER;

  return files.toSorted((a, b) => indexOf(a) - indexOf(b));
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
