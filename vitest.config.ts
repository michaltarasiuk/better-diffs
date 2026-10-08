import {resolve} from 'node:path';

import nextEnv from '@next/env';
import {defaultExclude, defineConfig} from 'vitest/config';

const dirname = import.meta.dirname;

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
    exclude: [...defaultExclude, '.next/**'],
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./vitest.setup.ts'],
        },
      },
    ],
  },
});
