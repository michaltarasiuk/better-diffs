import {useParams} from 'next/navigation';

export function useId() {
  const shareId = useParams<{shareId: string}>().shareId;
  return shareId;
}
