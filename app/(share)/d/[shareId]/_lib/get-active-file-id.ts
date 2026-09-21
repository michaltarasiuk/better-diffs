import type {CodeView} from '@pierre/diffs';

import {isDefined} from '@/utils/defined';
import type {AnnotationMetadata} from '@/diffs/annotations';

export function getActiveFileId(codeView: CodeView<AnnotationMetadata, null>) {
  const viewportTop = codeView.getScrollTop();
  const viewportBottom = viewportTop + codeView.getHeight();

  let activeFileId: string | null = null;

  for (const {id, item, instance} of codeView.getRenderedItems()) {
    const itemTop = codeView.getTopForItem(id);
    if (!isDefined(itemTop)) {
      continue;
    }

    const itemBottom = itemTop + instance.getVirtualizedHeight();
    const intersectsViewport =
      itemTop < viewportBottom && itemBottom > viewportTop;
    if (!intersectsViewport) {
      continue;
    }

    if (!item.collapsed) {
      activeFileId = id;
      break;
    } else {
      activeFileId ??= id;
    }
  }

  return activeFileId;
}
