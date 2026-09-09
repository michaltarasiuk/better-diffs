import {loadEnvConfig} from '@next/env';
import {createEnv} from '@t3-oss/env-core';
import {z} from 'zod';

loadEnvConfig(process.cwd());

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    BASE_URL: z.url(),
    DATABASE_URL: z.string(),
    DATABASE_AUTH_TOKEN: z.string().optional(),
    BETTER_AUTH_SECRET: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    CRON_SECRET: z.string().optional(),
    VERCEL: z.string().optional(),
    NEXT_RUNTIME: z.enum(['nodejs', 'edge']).optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
