import type {CodeView} from '@pierre/diffs';

import {isDefined} from '@/utils/defined';

export function getActiveFileId(
  codeView: Pick<CodeView, 'getScrollTop' | 'getTopForItem'>,
  fileIds: readonly string[],
) {
  const scrollTop = codeView.getScrollTop();
  let active: string | null = null;

  for (const id of fileIds) {
    const top = codeView.getTopForItem(id);
    if (!isDefined(top)) {
      continue;
    }
    if (top <= scrollTop) {
      active = id;
    } else {
      break;
    }
  }

  return active;
}
