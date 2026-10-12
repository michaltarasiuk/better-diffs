import {defineConfig} from 'drizzle-kit';

import {env} from './src/env';

export default defineConfig({
  dialect: 'turso',
  schema: './src/db/schema',
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
});
