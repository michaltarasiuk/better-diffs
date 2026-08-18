import 'server-only';

import {createEnv} from '@t3-oss/env-core';
import {z} from 'zod';

export const env = createEnv({
  server: {
    BASE_URL: z.url(),
    DATABASE_PATH: z.string(),
    BETTER_AUTH_SECRET: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    CRON_SECRET: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
