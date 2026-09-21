import {isEditableTarget} from './is-editable-target';
import {isUnmodifiedKeyDown} from './is-unmodified-key-down';

export function isGlobalShortcut(event: KeyboardEvent, key: string) {
  return isUnmodifiedKeyDown(event, key) && !isEditableTarget(event.target);
}
