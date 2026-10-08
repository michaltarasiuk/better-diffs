import {resolve} from 'node:path';

// @next/env ships a bundled CommonJS file whose exports Node cannot detect,
// so a named import fails when Vite loads this config.
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
      // server-only throws unless resolved under the react-server condition,
      // which only Next.js sets. Point it at the no-op build instead.
      'server-only': resolve(dirname, 'node_modules/server-only/empty.js'),
    },
  },
  test: {
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    // Vite's loadEnv would merge .env.local into tests. Next.js skips it when
    // NODE_ENV is test, which Vitest sets before loading this config.
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
          // Browser test files share one origin and therefore one IndexedDB,
          // so parallel files would delete each other's databases.
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
