import 'server-only';

import {betterAuth} from 'better-auth';
import {drizzleAdapter} from 'better-auth/adapters/drizzle';
import {nextCookies} from 'better-auth/next-js';

import {db} from '@/data/db';
import * as authSchema from '@/data/schema/auth';
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
