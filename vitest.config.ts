import {resolve} from 'node:path';

import {playwright} from '@vitest/browser-playwright';
import {loadEnv} from 'vite';
import {defaultExclude, defineConfig} from 'vitest/config';

const dirname = import.meta.dirname;

const sharedExclude = [...defaultExclude, '.next/**'];

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': resolve(dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    env: loadEnv('test', dirname, ''),
    exclude: sharedExclude,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          exclude: [...sharedExclude, 'events/idb.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['events/idb.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{browser: 'chromium'}],
          },
        },
      },
    ],
  },
});
