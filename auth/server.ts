import 'server-only';

import {headers} from 'next/headers';

import {betterAuth} from 'better-auth';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {nextCookies} from 'better-auth/next-js';

import {db} from '@/db/db';
import * as authSchema from '@/db/schema/auth';
import {env} from '@/env';

export const auth = betterAuth({
  appName: 'Better Diffs',
  baseURL: env.BASE_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
  }),
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
