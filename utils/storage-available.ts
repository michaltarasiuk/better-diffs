import {isDefined} from './is-defined';

export type StorageType = 'localStorage' | 'sessionStorage';

const availabilityCache = new Map<StorageType, boolean>();

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      availabilityCache.clear();
    }
  });
}

export function storageAvailable(type: StorageType) {
  let available = availabilityCache.get(type);
  if (!isDefined(available)) {
    available = probeStorage(type);
    availabilityCache.set(type, available);
  }
  return available ?? false;
}

function probeStorage(type: StorageType) {
  let storage: Storage | null = null;

  try {
    storage = window[type];
    const key = '__storage_test__';
    storage.setItem(key, key);
    storage.removeItem(key);
    return true;
  } catch (error: unknown) {
    return (
      error instanceof DOMException &&
      error.name === 'QuotaExceededError' &&
      /* QuotaExceededError can also mean storage is disabled; treat it as
         available only when something is already stored */
      isDefined(storage) &&
      storage.length !== 0
    );
  }
}
