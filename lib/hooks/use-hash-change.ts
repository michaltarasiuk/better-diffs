import {useEffect, useEffectEvent} from 'react';

export function useHashChange(onHashChange: (event: HashChangeEvent) => void) {
  const onHashChangeEvent = useEffectEvent(onHashChange);
  useEffect(() => {
    window.addEventListener('hashchange', onHashChangeEvent);
    return () => window.removeEventListener('hashchange', onHashChangeEvent);
  }, []);
}
