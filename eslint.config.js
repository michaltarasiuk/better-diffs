import vitest from '@vitest/eslint-plugin';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import perfectionist from 'eslint-plugin-perfectionist';
import reactCompiler from 'eslint-plugin-react-compiler';
import testingLibrary from 'eslint-plugin-testing-library';
import {defineConfig, globalIgnores} from 'eslint/config';

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

const REACT_NAMESPACE_FOR_TYPES =
  'Use the React namespace for types (e.g. React.ReactNode).';

const namedSpecifierOrder = (selector) => ({
  customGroups: [
    {
      groupName: 'constant',
      selector,
      elementNamePattern: '^[A-Z][A-Z0-9_]*$',
    },
  ],
  groups: ['constant', `value-${selector}`, `type-${selector}`],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactCompiler.configs.recommended,
  globalIgnores(['.next/**', 'next-env.d.ts']),
  {
    plugins: {
      perfectionist,
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'import/no-duplicates': ['error', {'prefer-inline': true}],
      'no-restricted-imports': ['error', {patterns: [DEEP_PARENT_IMPORT]}],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[source.value='react'] ImportSpecifier[importKind='type']",
          message: REACT_NAMESPACE_FOR_TYPES,
        },
        {
          selector:
            "ImportDeclaration[source.value='react'][importKind='type']",
          message: REACT_NAMESPACE_FOR_TYPES,
        },
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          internalPattern: ['^@/'],
          newlinesBetween: 1,
          customGroups: [
            {
              groupName: 'react',
              elementNamePattern: '^react(?:-dom)?(?:$|/)',
            },
            {
              groupName: 'next',
              elementNamePattern: '^next(?:$|/)',
            },
          ],
          groups: [
            ['side-effect', 'side-effect-style'],
            'builtin',
            'react',
            {newlinesBetween: 0},
            'next',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'unknown',
          ],
        },
      ],
      'perfectionist/sort-named-imports': [
        'error',
        namedSpecifierOrder('import'),
      ],
      'perfectionist/sort-exports': 'error',
      'perfectionist/sort-named-exports': [
        'error',
        namedSpecifierOrder('export'),
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
