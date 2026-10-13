import {loadEnvConfig} from '@next/env';
import {defineConfig} from 'drizzle-kit';
import {z} from 'zod';

loadEnvConfig(process.cwd());

const env = z
  .object({
    DATABASE_URL: z.string(),
    DATABASE_AUTH_TOKEN: z
      .string()
      .optional()
      .transform((token) => token || undefined),
  })
  .parse(process.env);

export default defineConfig({
  dialect: 'turso',
  schema: './db/schema',
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
});
