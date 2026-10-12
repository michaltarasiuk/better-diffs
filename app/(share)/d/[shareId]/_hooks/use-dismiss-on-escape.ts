import {useState} from 'react';
import {useFocusWithin} from 'react-aria/useFocusWithin';

import {useKeyDown} from '@/hooks/use-key-down';

export function useDismissOnEscape(onDismiss?: () => void) {
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const {focusWithinProps} = useFocusWithin({
    onFocusWithinChange(isFocusWithin) {
      setIsFocusWithin(isFocusWithin);
    },
  });

  useKeyDown((event) => {
    if (event.key === 'Escape' && isFocusWithin) {
      onDismiss?.();
    }
  });

  return focusWithinProps;
}
