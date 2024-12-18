import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import sortExportsPlugin from 'eslint-plugin-sort-exports';
import plugin from '@stylistic/eslint-plugin';

export default [
  js.configs.recommended,

  importPlugin.flatConfigs.recommended,

  stylistic.configs.customize({
    semi: true,
    braceStyle: '1tbs',
  }),

  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    plugins: {
      'sort-exports': sortExportsPlugin,
    },
    rules: {
      'sort-imports': ['warn', { ignoreDeclarationSort: true }],
      'import/order': ['warn', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        alphabetize: { order: 'asc' },
      }],
      'import/export': 'error',
      'import/no-duplicates': 'warn',
      'import/consistent-type-specifier-style': ['warn', 'prefer-inline'],

      '@stylistic/max-statements-per-line': 'off',

      'sort-exports/sort-exports': 'warn',
    },
  },
];
