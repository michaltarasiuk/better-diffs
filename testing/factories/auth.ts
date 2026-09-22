import {USER_ID} from '@/testing/ids';
import type {Session} from '@/auth/auth';

export function createSession(overrides: Partial<Session> = {}): Session {
  const {user, ...rest} = overrides;

  return {
    user: {id: USER_ID, ...user},
    ...rest,
  } as Session;
}
