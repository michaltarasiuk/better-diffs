'use client';

import {Drawer} from '@heroui/react';
import {cn, drawerVariants} from '@heroui/styles';
import {useRef, useState} from 'react';
import {useMove} from 'react-aria/useMove';

const SWIPE_UP_THRESHOLD = -40;
const drawerSlots = drawerVariants();

interface SidebarSheetProps {
  readonly children: React.ReactNode;
}

export function SidebarSheet({children}: SidebarSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const deltaY = useRef(0);

  const {moveProps} = useMove({
    onMoveStart() {
      deltaY.current = 0;
    },
    onMove(event) {
      deltaY.current += event.deltaY;
    },
    onMoveEnd() {
      if (deltaY.current <= SWIPE_UP_THRESHOLD) {
        setIsOpen(true);
      }
      deltaY.current = 0;
    },
  });

  return (
    <>
      {!isOpen ? (
        <div
          {...moveProps}
          aria-label="Swipe up to open files"
          className={cn(
            'fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-50 touch-none pt-8 select-none',
            drawerSlots.handle(),
          )}
        >
          <div data-slot="drawer-handle-bar" />
        </div>
      ) : null}

      <Drawer.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="h-full bg-trees-sidebar px-0 pb-0">
            <Drawer.Handle />
            <Drawer.Body>{children}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
