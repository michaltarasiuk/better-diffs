import {createEnv} from '@t3-oss/env-core';
import {z} from 'zod';

export const env = createEnv({
  server: {
    BASE_URL: z.url(),
    DATABASE_PATH: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
