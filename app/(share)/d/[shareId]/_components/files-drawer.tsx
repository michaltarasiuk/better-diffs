'use client';

import {Drawer} from '@heroui/react';
import {fbs} from 'fbtee';

export function FilesDrawer({children}: {readonly children: React.ReactNode}) {
  return (
    <Drawer>
      <Drawer.Trigger
        aria-label={fbs(
          'Open files',
          'Handle that opens the changed files drawer',
        )}
        className="fixed inset-x-0 bottom-0 py-7 outline-none focus-visible:status-focused"
      >
        <Drawer.Handle className="py-0 *:data-[slot=drawer-handle-bar]:bg-foreground/50 *:data-[slot=drawer-handle-bar]:ring-1 *:data-[slot=drawer-handle-bar]:ring-background/60" />
      </Drawer.Trigger>

      <Drawer.Backdrop>
        <Drawer.Content placement="bottom">
          <Drawer.Dialog
            aria-label={fbs(
              'Files',
              'Accessible name of the changed files drawer',
            )}
            className="h-[85dvh] max-h-[85dvh] bg-trees-sidebar px-0 pt-3 pb-0"
          >
            <Drawer.Handle />

            <Drawer.Body>{children}</Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
