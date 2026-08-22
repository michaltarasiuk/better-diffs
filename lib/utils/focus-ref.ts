import 'client-only';

import {isDefined} from '@/lib/utils/is-defined';

export function focusRef<T extends HTMLElement>(n: T | null) {
  if (!isDefined(n)) {
    return;
  }
  queueMicrotask(() => {
    if (n.isConnected) {
      n.focus({preventScroll: true});
    }
  });
}
