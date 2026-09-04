'use client';

import {mergeProps} from '@react-aria/utils';
import React, {useState} from 'react';
import {useFocusRing} from 'react-aria/useFocusRing';
import {useMove} from 'react-aria/useMove';

const MIN_WIDTH = 240;
const MAX_WIDTH = 480;

const DEFAULT_WIDTH = 320;

export function ResizableSidebar({
  children,
  ...props
}: React.ComponentProps<'aside'>) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const {moveProps} = useMove({
    onMoveStart() {
      setIsResizing(true);
    },
    onMove(event) {
      setWidth((width) => clampWidth(width + event.deltaX));
    },
    onMoveEnd() {
      setIsResizing(false);
    },
  });
  const {focusProps} = useFocusRing();

  return (
    <aside
      className="relative hidden shrink-0 border-e md:block"
      style={{width}}
      {...props}
    >
      {children}
      <div
        {...mergeProps(moveProps, focusProps, {
          role: 'separator',
          'aria-orientation': 'vertical',
          'aria-label': 'Resize sidebar',
          'aria-valuemin': MIN_WIDTH,
          'aria-valuemax': MAX_WIDTH,
          'aria-valuenow': width,
          'data-resizing': isResizing || undefined,
        })}
        className="absolute inset-y-0 -inset-e-px z-10 w-2 cursor-col-resize touch-none after:absolute after:inset-y-0 after:inset-s-1/2 after:w-px after:-translate-x-1/2 after:bg-transparent hover:after:bg-border focus-visible:after:bg-border resizing:after:bg-border"
      />
    </aside>
  );
}

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}
