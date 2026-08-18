import {isPresent} from '@/lib/utils/is-present';

export function focusRef<T extends HTMLElement>(node: T | null) {
  if (isPresent(node)) {
    queueMicrotask(() => node.focus());
  }
}
