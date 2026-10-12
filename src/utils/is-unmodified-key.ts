export function isUnmodifiedKey(event: KeyboardEvent, key: string) {
  return (
    event.key === key &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.shiftKey
  );
}
