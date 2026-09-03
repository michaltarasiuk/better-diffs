import {defineConfig} from 'drizzle-kit';

import {env} from './lib/env';

export default defineConfig({
  dialect: 'turso',
  schema: './lib/db/schema',
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
});
