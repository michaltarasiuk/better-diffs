import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {loadEnvConfig} from '@next/env';
import {defineConfig} from 'drizzle-kit';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

loadEnvConfig(projectRoot);

export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/db/schema',
  dbCredentials: {
    url: process.env.DATABASE_PATH!,
  },
});
