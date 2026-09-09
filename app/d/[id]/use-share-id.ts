import {useParams} from 'next/navigation';

export function useShareId() {
  const shareId = useParams<{id: string}>().id;
  return shareId;
}
