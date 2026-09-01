import {
  FILE_TREE_DEFAULT_ITEM_HEIGHT,
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
  type FileTreeOptions,
  type GitStatus,
  type GitStatusEntry,
} from '@pierre/trees';

import {isDefined} from '@/lib/utils/defined';

import {TREES_FOCUS_RING_UNSAFE_CSS} from './unsafe-css';

import type {ChangeTypes, FileDiffMetadata} from '@pierre/diffs';

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
  files: readonly FileDiffMetadata[],
  {viewportHeight}: {readonly viewportHeight?: number} = {},
) {
  const {paths} = prepareFileTreeInput(
    files.map((f) => f.name),
    {flattenEmptyDirectories: true},
  );

  return {
    paths,
    gitStatus: getGitStatusEntries(files),
    initialVisibleRowCount: isDefined(viewportHeight)
      ? getInitialVisibleRowCount(viewportHeight)
      : DEFAULT_INITIAL_VISIBLE_ROW_COUNT,
  };
}

export function sortFilesByTreeOrder<T extends {readonly name: string}>(
  files: readonly T[],
  order: readonly string[],
) {
  const rankByPath = new Map(order.map((path, rank) => [path, rank]));
  const rankOf = (file: T) => rankByPath.get(file.name) ?? order.length;

  return files.toSorted((a, b) => rankOf(a) - rankOf(b));
}

export function getTreeOptions({
  paths,
  gitStatus,
  initialVisibleRowCount,
}: TreeHandoff): FileTreeOptions {
  return {
    ...DIFF_TREE_OPTIONS,
    preparedInput: preparePresortedFileTreeInput(paths),
    gitStatus,
    initialVisibleRowCount,
  };
}

function getGitStatusEntries(
  files: readonly FileDiffMetadata[],
): readonly GitStatusEntry[] {
  return files.map((f) => ({
    path: f.name,
    status: changeTypeToGitStatus(f.type),
  }));
}

function getInitialVisibleRowCount(viewportHeight: number) {
  const rowsHeight =
    viewportHeight - DIFF_TREE_SEARCH_HEIGHT - DIFF_TREE_SUMMARY_HEIGHT;

  return Math.max(1, Math.ceil(rowsHeight / FILE_TREE_DEFAULT_ITEM_HEIGHT));
}

function changeTypeToGitStatus(t: ChangeTypes): GitStatus {
  switch (t) {
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
      return t satisfies never;
  }
}
