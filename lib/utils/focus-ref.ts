import {isDefined} from '@/lib/utils/is-defined';

export function focusRef<T extends HTMLElement>(node: T | null) {
  if (isDefined(node)) {
    queueMicrotask(() => node.focus());
  }
}
