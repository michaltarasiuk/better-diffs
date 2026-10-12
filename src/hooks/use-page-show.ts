import {useEffect, useEffectEvent} from 'react';

export function usePageShow(onPageShow: (event: PageTransitionEvent) => void) {
  const onPageShowEvent = useEffectEvent(onPageShow);
  useEffect(() => {
    window.addEventListener('pageshow', onPageShowEvent);
    return () => window.removeEventListener('pageshow', onPageShowEvent);
  }, []);
}
