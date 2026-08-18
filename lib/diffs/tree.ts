import type {ChangeTypes, FileDiffMetadata} from '@pierre/diffs';

import {
  FILE_TREE_DEFAULT_ITEM_HEIGHT,
  type FileTreeOptions,
  type GitStatus,
  type GitStatusEntry,
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
} from '@pierre/trees';

const DIFF_TREE_ID = 'diff-file-tree';

// Budget first-render work for a full-height sidebar before the browser measures.
const DIFF_TREE_INITIAL_VISIBLE_ROW_COUNT = Math.ceil(
  900 / FILE_TREE_DEFAULT_ITEM_HEIGHT,
);
const DIFF_TREE_OVERSCAN = 8;

const DIFF_TREE_OPTIONS = {
  id: DIFF_TREE_ID,
  flattenEmptyDirectories: true,
  initialExpansion: 'open',
  initialVisibleRowCount: DIFF_TREE_INITIAL_VISIBLE_ROW_COUNT,
  overscan: DIFF_TREE_OVERSCAN,
} as const;

export interface DiffTreeHandoff {
  readonly sortedPaths: readonly string[];
  readonly gitStatus: readonly GitStatusEntry[];
}

export function prepareDiffTreeHandoff(
  files: readonly FileDiffMetadata[],
): DiffTreeHandoff {
  const paths = files.map((file) => file.name);
  const preparedInput = prepareFileTreeInput(paths, {
    flattenEmptyDirectories: true,
  });

  return {
    sortedPaths: preparedInput.paths,
    gitStatus: getDiffGitStatus(files),
  };
}

export function getDiffTreeOptions(handoff: DiffTreeHandoff): FileTreeOptions {
  return {
    ...DIFF_TREE_OPTIONS,
    preparedInput: preparePresortedFileTreeInput(handoff.sortedPaths),
    gitStatus: handoff.gitStatus,
  };
}

function getDiffGitStatus(
  files: readonly FileDiffMetadata[],
): GitStatusEntry[] {
  return files.map(({name, type}) => ({
    path: name,
    status: fileTypeToGitStatus(type),
  }));
}

function fileTypeToGitStatus(changeType: ChangeTypes): GitStatus {
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
      const unreachable: never = changeType;
      return unreachable;
  }
}
