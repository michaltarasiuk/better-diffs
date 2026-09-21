import {use, useEffect, useEffectEvent, useState} from 'react';
import {browser} from 'react-dom';

import {isDefined} from '@/utils/is-defined';
import {storageAvailable} from '@/utils/storage-available';

export function useLocalStorage<T>(
  key: string,
  initialItem: () => T,
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse as (text: string) => T,
  } = {},
) {
  use(browser());

  function parseItem(stored: string | null) {
    if (!isDefined(stored)) {
      return initialItem();
    }

    try {
      return deserialize(stored);
    } catch {
      return initialItem();
    }
  }

  function getItem() {
    if (!storageAvailable('localStorage')) {
      return initialItem();
    }

    return parseItem(localStorage.getItem(key));
  }

  const [item, setItem] = useState(getItem);

  const onStorageEvent = useEffectEvent((event: StorageEvent) => {
    if (event.key === key) {
      setItem(parseItem(event.newValue));
    }
  });

  useEffect(() => {
    window.addEventListener('storage', onStorageEvent);
    return () => window.removeEventListener('storage', onStorageEvent);
  }, []);

  function setStoredItem(setItemAction: React.SetStateAction<T>) {
    setItem((i) => {
      const newItem =
        typeof setItemAction === 'function'
          ? (setItemAction as (prevState: T) => T)(i)
          : setItemAction;

      if (storageAvailable('localStorage')) {
        localStorage.setItem(key, serialize(newItem));
      }

      return newItem;
    });
  }

  return [item, setStoredItem] as const;
}
