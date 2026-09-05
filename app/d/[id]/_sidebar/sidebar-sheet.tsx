'use client';

import {Drawer} from '@heroui/react';

interface SidebarSheetProps {
  readonly children: React.ReactNode;
}

export function SidebarSheet({children}: SidebarSheetProps) {
  return (
    <Drawer>
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
