import type {Session} from '@/auth/auth';
import {USER_ID} from '../ids';

export function createSession(overrides: Partial<Session> = {}) {
  return {
    user: {id: USER_ID},
    ...overrides,
  } as Session;
}
