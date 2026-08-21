import {
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
  type FileTreeOptions,
  type GitStatus,
  type GitStatusEntry,
} from '@pierre/trees';

import type {ChangeTypes, FileDiffMetadata} from '@pierre/diffs';

const DIFF_TREE_OPTIONS = {
  id: 'diff-file-tree',
  flattenEmptyDirectories: true,
  initialExpansion: 'open',
  initialVisibleRowCount: Infinity,
} satisfies Partial<FileTreeOptions>;

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

export function sortFilesByTreeOrder<T extends {readonly name: string}>(
  files: readonly T[],
  sortedPaths: readonly string[],
) {
  const order = new Map(sortedPaths.map((path, index) => [path, index]));

  return files.toSorted(
    (left, right) =>
      (order.get(left.name) ?? Number.POSITIVE_INFINITY) -
      (order.get(right.name) ?? Number.POSITIVE_INFINITY),
  );
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
