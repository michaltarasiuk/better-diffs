import {isEditableTarget} from '@/utils/is-editable-target';
import {isUnmodifiedKey} from '@/utils/is-unmodified-key';

import {useKeyDown} from './use-key-down';

export function useShortcut(key: string, onShortcut: () => void) {
  useKeyDown((event) => {
    if (
      event.repeat ||
      !isUnmodifiedKey(event, key) ||
      isEditableTarget(event.target)
    ) {
      return;
    }
    event.preventDefault();
    onShortcut();
  });
}
