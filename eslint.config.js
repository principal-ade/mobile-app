// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [{
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
  },
  plugins: {
    '@typescript-eslint': tsPlugin,
    'react-hooks': reactHooksPlugin,
  },
  rules: {
    ...tsPlugin.configs.recommended.rules,
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
}, {
  ignores: ['node_modules/**', 'dist/**', '.expo/**', '.rnstorybook/**'],
}, ...storybook.configs["flat/recommended"]];
