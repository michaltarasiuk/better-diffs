'use client';

import {ShareEventsProvider} from '@/events/provider';
import {useId} from '../_hooks/use-id';

export function SyncEvents({children}: {readonly children: React.ReactNode}) {
  const shareId = useId();
  return (
    <ShareEventsProvider shareId={shareId}>{children}</ShareEventsProvider>
  );
}
