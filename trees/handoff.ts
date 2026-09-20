import type {FileDiffMetadata} from '@pierre/diffs';
import {
  type FileTreeOptions,
  type GitStatus,
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
} from '@pierre/trees';

import {TREES_FOCUS_RING_UNSAFE_CSS} from './unsafe-css';

export type TreeHandoff = ReturnType<typeof prepareTreeHandoff>;
export type TreeHandoffFile = Pick<FileDiffMetadata, 'name' | 'type'>;

export function prepareTreeHandoff(fileDiffs: readonly TreeHandoffFile[]) {
  const {paths} = prepareFileTreeInput(
    fileDiffs.map(({name}) => name),
    {flattenEmptyDirectories: true},
  );

  const gitStatus = fileDiffs.map(({name, type}) => ({
    path: name,
    status: changeTypeToGitStatus(type),
  }));

  return {
    paths,
    gitStatus,
  };
}

export function orderFilesByTree<T extends {readonly name: string}>(
  files: readonly T[],
  tree: TreeHandoff,
) {
  const rankByPath = new Map(tree.paths.map((path, rank) => [path, rank]));

  return files.toSorted(
    (a, b) =>
      (rankByPath.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
      (rankByPath.get(b.name) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function getTreeOptions(
  {paths, gitStatus}: TreeHandoff,
  {searchQuery}: {readonly searchQuery: string | null},
) {
  return {
    id: 'diff-file-tree',
    preparedInput: preparePresortedFileTreeInput(paths),
    initialExpansion: 'open',
    fileTreeSearchMode: 'hide-non-matches',
    initialSearchQuery: searchQuery,
    gitStatus,
    unsafeCSS: TREES_FOCUS_RING_UNSAFE_CSS,
  } satisfies FileTreeOptions;
}

function changeTypeToGitStatus(
  changeType: FileDiffMetadata['type'],
): GitStatus {
  switch (changeType) {
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
      return changeType satisfies never;
  }
}
