import vitest from '@vitest/eslint-plugin';
import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import reactCompiler from 'eslint-plugin-react-compiler';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibrary from 'eslint-plugin-testing-library';

const TEST_FILES = ['**/__tests__/**'];

const CLIENT_FILES = [
  'diffs/**',
  'hooks/**',
  'lexical/**',
  'trees/**',
  'events/{actor,idb,provider,sync}.{ts,tsx}',
  'app/**/_components/**',
  'app/**/_hooks/**',
  'app/**/_lib/**',
];

const PURE_FILES = [
  'http/error.ts',
  'http/headers/**',
  'utils/**',
  'diffs/{annotations,empty,lines,schemas,stats}.ts',
  'events/{actor,errors,schemas,state}.ts',
  'trees/input.ts',
];

const ROUTE_PRIVATE = {
  group: ['@/app/**'],
  message:
    'Route code is private to its segment. ' +
    'Import it relatively from inside the segment, or move what is shared to a top-level folder.',
};

const SERVER_ONLY = {
  group: ['@/db/**', '@/auth/server', '@/auth/bearer'],
  allowTypeImports: true,
  message:
    'Server-only. ' +
    'Reach the database and session through a server action (events/actions.ts) or a route handler, and pass the result in.',
};

const FRAMEWORK = {
  group: [
    'react',
    'react-dom',
    'next',
    'next/*',
    'idb',
    '@/http/fetch',
    '@/http/route',
    '@/hooks/**',
    '@/events/{actions,idb,provider,sync}',
  ],
  allowTypeImports: true,
  message:
    'Pure module: no React, Next.js, storage or network. ' +
    'Keep that in the caller and pass plain values in.',
};

const DB_DEPENDENCIES = [
  {
    regex: '^@/(?!env$|utils/|events/schemas$|db/)',
    message:
      'db/ depends only on env, utils and the event schemas. ' +
      'Take anything else as an argument, as appendEvents takes `validate`.',
  },
  {
    group: ['react', 'react-dom', 'next', 'next/*'],
    message:
      'db/ is framework-free so route handlers, actions and tests share it.',
  },
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  reactCompiler.configs.recommended,
  globalIgnores(['.next/**', '.agents/**', 'next-env.d.ts']),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    settings: {
      // import/no-cycle parses every module it follows; skipping packages
      // keeps it to our own code.
      'import/ignore': ['node_modules'],
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Side effect imports.
            ['^\\u0000'],
            // Node.js builtins.
            ['^node:'],
            // Packages.
            ['^@?\\w'],
            // Absolute imports.
            ['^@/'],
            // Relative imports.
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': ['error', {'prefer-inline': true}],
      'import/no-cycle': 'error',
      'import/no-anonymous-default-export': 'off',
      'no-console': ['warn', {allow: ['warn', 'error']}],
      eqeqeq: ['error', 'smart'],
      'object-shorthand': 'error',
      'prefer-template': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {fixStyle: 'inline-type-imports', disallowTypeAnnotations: false},
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {checksVoidReturn: {attributes: false}},
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {patterns: [ROUTE_PRIVATE]},
      ],
    },
  },
  // Boundaries. Flat config replaces a rule's options rather than merging
  // them, so each block repeats the restrictions of the blocks before it.
  {
    files: CLIENT_FILES,
    ignores: TEST_FILES,
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {patterns: [ROUTE_PRIVATE, SERVER_ONLY]},
      ],
    },
  },
  {
    files: ['db/**'],
    ignores: TEST_FILES,
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {patterns: [ROUTE_PRIVATE, ...DB_DEPENDENCIES]},
      ],
    },
  },
  {
    files: PURE_FILES,
    ignores: TEST_FILES,
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {patterns: [ROUTE_PRIVATE, SERVER_ONLY, FRAMEWORK]},
      ],
    },
  },
  {
    files: ['**/*.{test,browser.test}.{ts,tsx}'],
    plugins: {
      vitest,
      ...testingLibrary.configs['flat/react'].plugins,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
    rules: {
      ...vitest.configs.recommended.rules,
      ...testingLibrary.configs['flat/react'].rules,
    },
  },
]);
