'use client';

import {ShareEventsProvider} from '@/events/provider';
import {useShareId} from '../_hooks/use-share-id';

export function SyncEvents({children}: {readonly children: React.ReactNode}) {
  const shareId = useShareId();
  return (
    <ShareEventsProvider shareId={shareId}>{children}</ShareEventsProvider>
  );
}
