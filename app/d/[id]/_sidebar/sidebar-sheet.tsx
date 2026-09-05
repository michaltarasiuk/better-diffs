'use client';

import {Button, Drawer} from '@heroui/react';
import {FilesIcon} from 'lucide-react';

interface SidebarSheetProps {
  readonly children: React.ReactNode;
}

export function SidebarSheet({children}: SidebarSheetProps) {
  return (
    <Drawer>
      <Drawer.Trigger>
        <Button
          aria-label="Browse files"
          variant="secondary"
          isIconOnly
          className="fixed inset-s-4 inset-be-4 z-20 shadow-md"
        >
          <FilesIcon aria-hidden className="size-5" />
        </Button>
      </Drawer.Trigger>
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
