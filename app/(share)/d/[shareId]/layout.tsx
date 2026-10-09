'use client';

import {usePageShow} from '@/hooks/use-page-show';

export default function ShareLayout({children}: LayoutProps<'/d/[shareId]'>) {
  usePageShow(function bypassBfcache(event) {
    if (event.persisted) {
      window.location.reload();
    }
  });

  return children;
}
