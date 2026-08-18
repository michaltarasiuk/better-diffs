import 'client-only';

import {isPresent} from '@/lib/utils/is-present';

export function focusRef<T extends HTMLElement>(node: T | null) {
  if (!isPresent(node)) {
    return;
  }
  queueMicrotask(() => {
    if (node.isConnected) {
      node.focus();
    }
  });
}
