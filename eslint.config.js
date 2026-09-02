import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import perfectionist from 'eslint-plugin-perfectionist';
import reactCompiler from 'eslint-plugin-react-compiler';
import {defineConfig, globalIgnores} from 'eslint/config';

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
      'perfectionist/sort-exports': 'error',
      'perfectionist/sort-named-exports': [
        'error',
        {groups: ['value-export', 'type-export']},
      ],
      'perfectionist/sort-named-imports': [
        'error',
        {groups: ['value-import', 'type-import']},
      ],
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            'side-effect',
            'value-builtin',
            'value-external',
            'value-internal',
            ['value-parent', 'value-sibling', 'value-index'],
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
