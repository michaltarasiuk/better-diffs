import {useEffect, useEffectEvent} from 'react';

export function useKeyDown(onKeyDown: (event: KeyboardEvent) => void) {
  const onKeyDownEvent = useEffectEvent(onKeyDown);
  useEffect(() => {
    document.addEventListener('keydown', onKeyDownEvent);
    return () => document.removeEventListener('keydown', onKeyDownEvent);
  }, []);
}
