import {isEditableTarget} from './is-editable-target';

function isUnmodifiedKeyDown(event: KeyboardEvent, key: string) {
  return (
    event.key === key &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  );
}

export function isGlobalShortcut(event: KeyboardEvent, key: string) {
  return isUnmodifiedKeyDown(event, key) && !isEditableTarget(event.target);
}
