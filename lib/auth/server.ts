import 'server-only';

import {headers} from 'next/headers';

import {auth, type Session} from '@/lib/auth';

export async function getSession(): Promise<Session | null> {
  return auth.api.getSession({
    headers: await headers(),
  });
}
