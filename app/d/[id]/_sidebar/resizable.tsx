'use client';

import {cn} from '@heroui/styles';
import {mergeProps} from '@react-aria/utils';
import {useState} from 'react';
import {Separator} from 'react-aria-components/Separator';
import {useFocusRing} from 'react-aria/useFocusRing';
import {useMove} from 'react-aria/useMove';

const MIN_WIDTH = 240;
const MAX_WIDTH = 480;

const DEFAULT_WIDTH = 320;

export function ResizableSidebar({
  children,
  style,
  className,
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
      {...props}
      style={{width, ...style}}
      className={cn('relative shrink-0', className)}
    >
      {children}
      <Separator
        {...mergeProps(moveProps, focusProps)}
        orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        data-resizing={isResizing || null}
        className="absolute inset-y-0 inset-e-0 z-10 w-4 translate-x-1/2 cursor-col-resize touch-none after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-transparent hover:after:bg-accent focus-visible:after:bg-accent resizing:after:w-0.5 resizing:after:bg-accent"
      />
    </aside>
  );
}

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}
