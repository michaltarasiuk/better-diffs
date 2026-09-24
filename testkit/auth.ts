import {uuid} from '@/testkit/uuid';
import type {Session} from '@/auth/auth';

export function createSession(overrides: Partial<Session> = {}): Session {
  const {user, ...rest} = overrides;

  return {
    user: {id: uuid(), ...user},
    ...rest,
  } as Session;
}
