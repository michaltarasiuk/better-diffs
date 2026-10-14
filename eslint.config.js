import vitest from '@vitest/eslint-plugin';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import perfectionist from 'eslint-plugin-perfectionist';
import testingLibrary from 'eslint-plugin-testing-library';
import {defineConfig, globalIgnores} from 'eslint/config';

const TEST_FILES = ['**/__tests__/**'];

const CLIENT_FILES = [
  'diffs/**',
  'hooks/**',
  'lexical/**',
  'trees/**',
  'threads/{actor,provider,sync}.{ts,tsx}',
  'app/**/_components/**',
  'app/**/_hooks/**',
  'app/**/_lib/**',
];

const PURE_FILES = [
  'http/error.ts',
  'http/headers/**',
  'utils/**',
  'diffs/{annotations,contents,empty,lines,schemas,stats}.ts',
  'threads/{actor,errors,schemas,state}.ts',
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
    'Reach the database and session through a server action (threads/actions.ts) or a route handler, and pass the result in.',
};

const FRAMEWORK = {
  group: [
    'react',
    'react-dom',
    'next',
    'next/*',
    '@/http/fetch',
    '@/http/route',
    '@/hooks/**',
    '@/threads/{actions,provider,sync}',
  ],
  allowTypeImports: true,
  message:
    'Pure module: no React, Next.js, storage or network. ' +
    'Keep that in the caller and pass plain values in.',
};

const DB_DEPENDENCIES = [
  {
    regex: '^@/(?!env$|utils/|threads/(?:schemas|errors)$|db/)',
    message:
      'db/ depends only on env, utils and the thread schemas and errors. ' +
      'Take anything else as an argument, as saveChanges takes `validate`.',
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
  globalIgnores(['.next/**', '.agents/**', '.local/**', 'next-env.d.ts']),
  {
    name: 'better-diffs/base',
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'no-console': ['warn', {allow: ['warn', 'error']}],
      eqeqeq: ['error', 'smart'],
      'object-shorthand': 'error',
      'prefer-template': 'error',
    },
  },
  {
    name: 'better-diffs/imports',
    plugins: {
      perfectionist,
    },
    settings: {
      // import/no-cycle parses every module it follows; skipping packages
      // keeps it to our own code.
      'import/ignore': ['node_modules'],
    },
    rules: {
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': ['error', {'prefer-inline': true}],
      'import/no-cycle': 'error',
      'import/no-anonymous-default-export': 'off',

      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          internalPattern: ['^@/'],
          newlinesBetween: 1,
          groups: [
            'side-effect',
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {type: 'natural', groups: ['value-import', 'type-import']},
      ],
      'perfectionist/sort-exports': ['error', {type: 'natural'}],
      'perfectionist/sort-named-exports': [
        'error',
        {type: 'natural', groups: ['value-export', 'type-export']},
      ],
    },
  },
  {
    name: 'better-diffs/typescript',
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {fixStyle: 'inline-type-imports', disallowTypeAnnotations: false},
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {patterns: [ROUTE_PRIVATE]},
      ],

      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {checksVoidReturn: {attributes: false}},
      ],

      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
  // Boundaries. Flat config replaces a rule's options rather than merging
  // them, so each block repeats the restrictions of the blocks before it.
  {
    name: 'better-diffs/boundaries/client',
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
    name: 'better-diffs/boundaries/db',
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
    name: 'better-diffs/boundaries/pure',
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
    name: 'better-diffs/tests',
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
