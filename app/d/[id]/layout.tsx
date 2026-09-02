'use client';

import {usePageShow} from '@/lib/hooks/use-page-show';

export default function DiffLayout({children}: LayoutProps<'/d/[id]'>) {
  usePageShow(function bypassBfcache(event) {
    if (event.persisted) {
      window.location.reload();
    }
  });

  return children;
}
