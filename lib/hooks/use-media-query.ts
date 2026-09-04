import {useSyncExternalStore} from 'react';

import {isDefined} from '@/lib/utils/defined';

export function useIsDesktop() {
  return useMediaQuery('(min-width: 768px)');
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mediaQueryList = getMediaQueryList(query);
      mediaQueryList.addEventListener('change', onStoreChange);
      return () => mediaQueryList.removeEventListener('change', onStoreChange);
    },
    () => getMediaQueryList(query).matches,
    () => false,
  );
}

const mediaQueryLists = new Map<string, MediaQueryList>();

function getMediaQueryList(query: string) {
  let list = mediaQueryLists.get(query);
  if (!isDefined(list)) {
    list = window.matchMedia(query);
    mediaQueryLists.set(query, list);
  }
  return list;
}
