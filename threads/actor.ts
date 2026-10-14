import type {Session} from '@/auth/server';

import type {Actor} from './schemas';

export function toActor(session: Session) {
  const actor: Actor = {
    name: session.user.name,
    image: session.user.image ?? null,
  };

  return {actorId: session.user.id, actor};
}
