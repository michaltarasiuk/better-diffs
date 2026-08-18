import type {ChangeTypes, FileDiffMetadata} from '@pierre/diffs';

import {
  type FileTreeOptions,
  type GitStatus,
  type GitStatusEntry,
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
} from '@pierre/trees';

const DIFF_TREE_OPTIONS = {
  id: 'diff-file-tree',
  flattenEmptyDirectories: true,
  initialExpansion: 'open',
  initialVisibleRowCount: Infinity,
} satisfies Partial<FileTreeOptions>;

export function prepareDiffTreeHandoff(files: readonly FileDiffMetadata[]) {
  const paths = files.map((file) => file.name);
  const preparedInput = prepareFileTreeInput(paths, {
    flattenEmptyDirectories: true,
  });

  return {
    sortedPaths: preparedInput.paths,
    gitStatus: getDiffGitStatus(files),
  } as const;
}

export type DiffTreeHandoff = ReturnType<typeof prepareDiffTreeHandoff>;

export function getDiffTreeOptions(handoff: DiffTreeHandoff): FileTreeOptions {
  return {
    ...DIFF_TREE_OPTIONS,
    preparedInput: preparePresortedFileTreeInput(handoff.sortedPaths),
    gitStatus: handoff.gitStatus,
  };
}

function getDiffGitStatus(
  files: readonly FileDiffMetadata[],
): readonly GitStatusEntry[] {
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
      return changeType satisfies never;
  }
}
