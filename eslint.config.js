import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import reactCompiler from 'eslint-plugin-react-compiler';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibrary from 'eslint-plugin-testing-library';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactCompiler.configs.recommended,
  globalIgnores(['.next/**', 'next-env.d.ts']),
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[source.value='react'] ImportSpecifier[importKind='type']",
          message: 'Use the React namespace for types (e.g. React.ReactNode).',
        },
        {
          selector:
            "ImportDeclaration[source.value='react'][importKind='type']",
          message: 'Use the React namespace for types (e.g. React.ReactNode).',
        },
      ],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^node:'],
            [
              '^(react\\/(.*)$)|^(react$)|^(react-dom(.*)$)',
              '^(next(.*)$)|^(next$)',
              '^(?!(?:app|auth|components|db|diffs|events|headers|hooks|trees|utils)(?:$|\\/))@?\\w',
            ],
            [
              '^(?:@\\/)?(?:utils|hooks|headers|env|fonts)(?:$|\\/)',
              '^(?:@\\/)?(?:auth|db|diffs|events|trees)(?:$|\\/)',
              '^(?:@\\/)?components(?:$|\\/)',
              '^(?:@\\/)?app(?:$|\\/)',
              '^@\\/',
              '^\\.',
            ],
            ['^'],
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    ...testingLibrary.configs['flat/react'],
  },
]);

export default eslintConfig;
