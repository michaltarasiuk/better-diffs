import vitest from '@vitest/eslint-plugin';
import {defineConfig, globalIgnores} from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import reactCompiler from 'eslint-plugin-react-compiler';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import testingLibrary from 'eslint-plugin-testing-library';

const testingLibraryReact = testingLibrary.configs['flat/react'];

const MODULES = [
  'auth',
  'db',
  'diffs',
  'events',
  'headers',
  'hooks',
  'lexical',
  'testing',
  'trees',
  'utils',
];

const DEEP_PARENT_IMPORT = {
  group: ['../../*'],
  message: 'Parent imports beyond one level use the @/ alias',
};

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
          disallowTypeAnnotations: false,
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'import/no-duplicates': ['error', {'prefer-inline': true}],
      'no-restricted-imports': ['error', {patterns: [DEEP_PARENT_IMPORT]}],
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
            ['^react(?:-dom)?(?:$|/)', '^next(?:$|/)'],
            ['^@?\\w'],
            ['^@/'],
            ['^\\.'],
          ],
        },
      ],
    },
  },
  ...MODULES.map((mod) => ({
    files: [`${mod}/**`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            DEEP_PARENT_IMPORT,
            {
              group: [`@/${mod}/*`],
              message: `Imports within ${mod} use relative paths`,
            },
          ],
        },
      ],
    },
  })),
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
      'vitest/consistent-test-filename': 'error',
      'vitest/consistent-test-it': ['error', {fn: 'it', withinDescribe: 'it'}],
      'vitest/max-nested-describe': ['error', {max: 2}],
    },
  },
]);

export default eslintConfig;
