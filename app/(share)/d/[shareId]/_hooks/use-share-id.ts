import {useParams} from 'next/navigation';

export function useShareId() {
  const shareId = useParams<{shareId: string}>().shareId;
  return shareId;
}
