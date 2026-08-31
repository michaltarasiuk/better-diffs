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

export type TreeHandoff = ReturnType<typeof prepareTreeHandoff>;

export function prepareTreeHandoff(
  files: readonly FileDiffMetadata[],
  {viewportHeight}: {readonly viewportHeight?: number} = {},
) {
  const paths = files.map((f) => f.name);
  const preparedInput = prepareFileTreeInput(paths, {
    flattenEmptyDirectories: true,
  });

  return {
    sortedPaths: preparedInput.paths,
    gitStatus: getDiffGitStatus(files),
    ...(isDefined(viewportHeight) && {
      initialVisibleRowCount: Math.max(
        1,
        Math.ceil(
          (viewportHeight -
            DIFF_TREE_SEARCH_HEIGHT -
            DIFF_TREE_SUMMARY_HEIGHT) /
            FILE_TREE_DEFAULT_ITEM_HEIGHT,
        ),
      ),
    }),
  };
}

export function sortFilesByTreeOrder<T extends {readonly name: string}>(
  files: readonly T[],
  order: readonly string[],
) {
  return files.toSorted(
    (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
  );
}

export function getTreeOptions(handoff: TreeHandoff): FileTreeOptions {
  return {
    ...DIFF_TREE_OPTIONS,
    preparedInput: preparePresortedFileTreeInput(handoff.sortedPaths),
    gitStatus: handoff.gitStatus,
    initialVisibleRowCount: handoff.initialVisibleRowCount,
  };
}

function getDiffGitStatus(
  files: readonly FileDiffMetadata[],
): readonly GitStatusEntry[] {
  return files.map((f) => ({
    path: f.name,
    status: fileTypeToGitStatus(f.type),
  }));
}

function fileTypeToGitStatus(t: ChangeTypes): GitStatus {
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
