import type {ChangeTypes, FileDiffMetadata} from '@pierre/diffs';

import {
  type FileTreeOptions,
  type GitStatus,
  type GitStatusEntry,
  prepareFileTreeInput,
} from '@pierre/trees';

const DIFF_TREE_ID = 'diff-file-tree';

export function getDiffTreeOptions(files: readonly FileDiffMetadata[]) {
  const paths = files.map((file) => file.name);

  return {
    id: DIFF_TREE_ID,
    preparedInput: prepareFileTreeInput(paths, {
      flattenEmptyDirectories: true,
    }),
    gitStatus: getDiffGitStatus(files),
    initialExpansion: 'open',
    initialVisibleRowCount: Infinity,
  } satisfies FileTreeOptions;
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
