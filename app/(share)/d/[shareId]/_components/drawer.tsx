'use client';

import {Drawer as HeroDrawer} from '@heroui/react';

export function Drawer({children}: {readonly children: React.ReactNode}) {
  return (
    <HeroDrawer>
      <HeroDrawer.Trigger
        aria-label="Open files"
        className="fixed inset-x-0 bottom-0 py-7 outline-none focus-visible:status-focused"
      >
        <HeroDrawer.Handle className="py-0" />
      </HeroDrawer.Trigger>

      <HeroDrawer.Backdrop>
        <HeroDrawer.Content placement="bottom">
          <HeroDrawer.Dialog className="h-[85dvh] max-h-[85dvh] bg-trees-sidebar px-0 pb-0">
            <HeroDrawer.Handle />

            <HeroDrawer.Body>{children}</HeroDrawer.Body>
          </HeroDrawer.Dialog>
        </HeroDrawer.Content>
      </HeroDrawer.Backdrop>
    </HeroDrawer>
  );
}
