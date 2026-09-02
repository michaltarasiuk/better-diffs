import {
  FILE_TREE_DEFAULT_ITEM_HEIGHT,
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
  type FileTreeOptions,
  type GitStatus,
} from '@pierre/trees';

import {isDefined} from '@/lib/utils/defined';

import {TREES_FOCUS_RING_UNSAFE_CSS} from './unsafe-css';

import type {FileDiffMetadata} from '@pierre/diffs';

const DIFF_TREE_OPTIONS = {
  id: 'diff-file-tree',
  initialExpansion: 'open',
  fileTreeSearchMode: 'hide-non-matches',
  unsafeCSS: TREES_FOCUS_RING_UNSAFE_CSS,
} satisfies Partial<FileTreeOptions>;

const DIFF_TREE_SEARCH_HEIGHT = 52;
const DIFF_TREE_SUMMARY_HEIGHT = 52;

const DEFAULT_INITIAL_VISIBLE_ROW_COUNT = 25;

export type TreeHandoff = ReturnType<typeof prepareTreeHandoff>;

export function prepareTreeHandoff(
  fileDiffs: readonly FileDiffMetadata[],
  {viewportHeight}: {readonly viewportHeight?: number} = {},
) {
  const {paths} = prepareFileTreeInput(
    fileDiffs.map((file) => file.name),
    {flattenEmptyDirectories: true},
  );

  let initialVisibleRowCount = DEFAULT_INITIAL_VISIBLE_ROW_COUNT;
  if (isDefined(viewportHeight)) {
    initialVisibleRowCount = getInitialVisibleRowCount(viewportHeight);
  }

  return {
    paths,
    initialVisibleRowCount,
    gitStatus: fileDiffs.map((file) => ({
      path: file.name,
      status: changeTypeToGitStatus(file.type),
    })),
  };
}

export function getTreeOptions(
  {paths, gitStatus, initialVisibleRowCount}: TreeHandoff,
  {searchQuery}: {readonly searchQuery: string | null},
) {
  return {
    ...DIFF_TREE_OPTIONS,
    preparedInput: preparePresortedFileTreeInput(paths),
    initialVisibleRowCount,
    initialSearchQuery: searchQuery,
    gitStatus,
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
