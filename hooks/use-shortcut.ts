import {isEditableTarget} from '@/utils/is-editable-target';
import {isUnmodifiedKey} from '@/utils/is-unmodified-key';

import {useKeyDown} from './use-key-down';
import {isDefined} from '@/utils/is-defined';

export function useShortcut(key: string, onShortcut: () => void) {
  useKeyDown((event) => {
    if (
      event.repeat ||
      !isUnmodifiedKey(event, key) ||
      !isDefined(event.target) ||
      isEditableTarget(event.target)
    ) {
      return;
    }
    event.preventDefault();
    onShortcut();
  });
}
