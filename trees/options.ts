import {
  preparePresortedFileTreeInput,
  type FileTreeOptions,
} from '@pierre/trees';

import type {TreeInput} from './input';
import {TREES_FOCUS_RING_UNSAFE_CSS} from './unsafe-css';

export function getFileTreeOptions(
  {paths, gitStatus}: TreeInput,
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
