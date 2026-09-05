'use client';

import {Drawer} from '@heroui/react';
import {Pressable} from 'react-aria-components/Modal';

interface SidebarSheetProps {
  readonly children: React.ReactNode;
}

export function SidebarSheet({children}: SidebarSheetProps) {
  return (
    <Drawer>
      <Pressable>
        <div
          aria-label="Open files"
          className="fixed inset-x-0 bottom-0 py-7 outline-none focus-visible:status-focused"
          role="button"
        >
          <Drawer.Handle className="py-0" />
        </div>
      </Pressable>

      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog className="h-full bg-trees-sidebar px-0 pb-0">
            <Drawer.Handle />
            <Drawer.Body>{children}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
