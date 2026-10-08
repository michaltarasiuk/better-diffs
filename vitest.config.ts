import {resolve} from 'node:path';

import nextEnv from '@next/env';
import {playwright} from '@vitest/browser-playwright';
import {defaultExclude, defineConfig} from 'vitest/config';

const dirname = import.meta.dirname;

const IGNORED_GLOBS = [...defaultExclude, '.next/**'];
const BROWSER_TEST_GLOBS = ['**/*.browser.test.{ts,tsx}'];

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      /*
       * server-only throws unless resolved under the react-server condition,
       * which only Next.js sets. Point it at the no-op build instead.
       */
      'server-only': resolve(dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    env: nextEnv.loadEnvConfig(dirname).combinedEnv,
    exclude: IGNORED_GLOBS,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
          exclude: [...IGNORED_GLOBS, ...BROWSER_TEST_GLOBS],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: BROWSER_TEST_GLOBS,
          /*
           * Browser test files share one origin and therefore one IndexedDB,
           * so parallel files would delete each other's databases.
           */
          fileParallelism: false,
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
