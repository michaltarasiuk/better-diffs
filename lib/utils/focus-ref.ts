import 'client-only';

import {isDefined} from '@/lib/utils/is-defined';

export function focusRef<T extends HTMLElement>(node: T | null) {
  if (!isDefined(node)) {
    return;
  }
  queueMicrotask(() => {
    if (node.isConnected) {
      node.focus({preventScroll: true});
    }
  });
}
