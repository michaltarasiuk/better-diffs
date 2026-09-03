import {
  FILE_TREE_DEFAULT_ITEM_HEIGHT,
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
  type FileTreeOptions,
  type GitStatus,
} from '@pierre/trees';

import {TREES_FOCUS_RING_UNSAFE_CSS} from '@/lib/trees/unsafe-css';
import {isDefined} from '@/lib/utils/defined';

import type {FileDiffMetadata} from '@pierre/diffs';

const DIFF_TREE_SEARCH_HEIGHT = 52;
const DIFF_TREE_SUMMARY_HEIGHT = 52;

const DEFAULT_INITIAL_VISIBLE_ROW_COUNT = 25;

export type TreeHandoff = ReturnType<typeof prepareTreeHandoff>;

export function prepareTreeHandoff(
  fileDiffs: readonly FileDiffMetadata[],
  {viewportHeight}: {readonly viewportHeight?: number} = {},
) {
  const gitStatus = fileDiffs.map(({name, type}) => ({
    path: name,
    status: changeTypeToGitStatus(type),
  }));

  const {paths} = prepareFileTreeInput(
    gitStatus.map(({path}) => path),
    {flattenEmptyDirectories: true},
  );

  return {
    paths,
    initialVisibleRowCount: isDefined(viewportHeight)
      ? getInitialVisibleRowCount(viewportHeight)
      : DEFAULT_INITIAL_VISIBLE_ROW_COUNT,
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
  {paths, initialVisibleRowCount, gitStatus}: TreeHandoff,
  {searchQuery}: {readonly searchQuery: string | null},
) {
  return {
    id: 'diff-file-tree',
    preparedInput: preparePresortedFileTreeInput(paths),
    initialExpansion: 'open',
    fileTreeSearchMode: 'hide-non-matches',
    initialSearchQuery: searchQuery,
    initialVisibleRowCount,
    gitStatus,
    unsafeCSS: TREES_FOCUS_RING_UNSAFE_CSS,
  } satisfies FileTreeOptions;
}

function getInitialVisibleRowCount(viewportHeight: number) {
  return Math.max(
    1,
    Math.ceil(
      viewportHeight -
        DIFF_TREE_SEARCH_HEIGHT -
        DIFF_TREE_SUMMARY_HEIGHT / FILE_TREE_DEFAULT_ITEM_HEIGHT,
    ),
  );
}

function changeTypeToGitStatus(
  changeType: 'change' | 'rename-pure' | 'rename-changed' | 'new' | 'deleted',
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
