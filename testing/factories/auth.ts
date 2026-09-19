import type {Session} from '@/auth/auth';
import {USER_ID} from '@/testing/ids';

export function createSession(overrides: Partial<Session> = {}) {
  return {
    user: {id: USER_ID},
    ...overrides,
  } as Session;
}
