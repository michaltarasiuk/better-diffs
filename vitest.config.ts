import {resolve} from 'node:path';

import {playwright} from '@vitest/browser-playwright';
import {loadEnv} from 'vite';
import {defaultExclude, defineConfig} from 'vitest/config';

const dirname = import.meta.dirname;

const SHARED_EXCLUDE = [...defaultExclude, '.next/**'];
const BROWSER_TEST_FILES = ['**/*.browser.test.{ts,tsx}'];

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': resolve(dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    env: loadEnv('test', dirname, ''),
    exclude: SHARED_EXCLUDE,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          exclude: [...SHARED_EXCLUDE, ...BROWSER_TEST_FILES],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: BROWSER_TEST_FILES,
          fileParallelism: false,
          sequence: {concurrent: false},
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
