import {useEffect, useEffectEvent} from 'react';

export function useHashChange(onHashChange: (e: HashChangeEvent) => void) {
  const onHashChangeEvent = useEffectEvent(onHashChange);
  useEffect(() => {
    window.addEventListener('hashchange', onHashChangeEvent);
    return () => window.removeEventListener('hashchange', onHashChangeEvent);
  }, []);
}
