import vitest from '@vitest/eslint-plugin';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import reactCompiler from 'eslint-plugin-react-compiler';
import testingLibrary from 'eslint-plugin-testing-library';
import {defineConfig, globalIgnores} from 'eslint/config';

const testingLibraryReact = testingLibrary.configs['flat/react'];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  reactCompiler.configs.recommended,
  globalIgnores(['.next/**', 'next-env.d.ts']),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.{test,browser.test}.{ts,tsx}'],
    plugins: {
      vitest,
      ...testingLibraryReact.plugins,
    },
    languageOptions: {
      globals: {...vitest.environments.env.globals},
    },
    rules: {
      ...vitest.configs.recommended.rules,
      ...testingLibraryReact.rules,
    },
  },
]);
