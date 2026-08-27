import {
  prepareFileTreeInput,
  preparePresortedFileTreeInput,
  type FileTreeOptions,
  type GitStatus,
  type GitStatusEntry,
} from '@pierre/trees';

import {TREES_FOCUS_RING_UNSAFE_CSS} from './css';

import type {ChangeTypes, FileDiffMetadata} from '@pierre/diffs';

const DIFF_TREE_OPTIONS = {
  id: 'diff-file-tree',
  flattenEmptyDirectories: true,
  initialExpansion: 'open',
  initialVisibleRowCount: Infinity,
  unsafeCSS: TREES_FOCUS_RING_UNSAFE_CSS,
} satisfies Partial<FileTreeOptions>;

export type DiffTreeHandoff = ReturnType<typeof prepareDiffTreeHandoff>;

export function prepareDiffTreeHandoff(files: readonly FileDiffMetadata[]) {
  const paths = files.map((f) => f.name);
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
  const order = new Map(sortedPaths.map((p, i) => [p, i]));

  return files.toSorted(
    (a, b) =>
      (order.get(a.name) ?? Number.POSITIVE_INFINITY) -
      (order.get(b.name) ?? Number.POSITIVE_INFINITY),
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
