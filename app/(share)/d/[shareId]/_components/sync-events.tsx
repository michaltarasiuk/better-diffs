'use client';

export {
  ShareStateContext,
  ShareStoreContext,
} from '@/events/share-events-provider';

import {ShareEventsProvider} from '@/events/share-events-provider';
import {useShareId} from '../_hooks/use-share-id';

export function SyncEvents({children}: {readonly children: React.ReactNode}) {
  const shareId = useShareId();
  return (
    <ShareEventsProvider shareId={shareId}>{children}</ShareEventsProvider>
  );
}
