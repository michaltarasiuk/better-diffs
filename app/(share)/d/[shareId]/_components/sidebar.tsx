'use client';

import {useState} from 'react';

import {useMove} from 'react-aria/useMove';

const MIN_WIDTH = 240;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 320;

const KEYBOARD_STEP = 16;

export function Sidebar({children}: {readonly children: React.ReactNode}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const {moveProps} = useMove({
    onMoveStart() {
      setIsResizing(true);
    },
    onMove({deltaX, pointerType}) {
      const step = pointerType === 'keyboard' ? KEYBOARD_STEP : 1;
      setWidth((w) => clampWidth(w + deltaX * step));
    },
    onMoveEnd() {
      setIsResizing(false);
    },
  });

  return (
    <aside
      aria-label="Files"
      style={{width}}
      className="relative hidden shrink-0 md:block"
    >
      {children}

      <div
        {...moveProps}
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={width}
        data-resizing={isResizing || undefined}
        className="absolute inset-y-0 inset-e-0 z-10 w-4 translate-x-1/2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:inset-s-1/2 after:w-0.5 after:-translate-x-1/2 hover:after:bg-accent focus-visible:after:bg-accent resizing:after:bg-accent"
      />
    </aside>
  );
}

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}
