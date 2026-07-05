import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

// Modules in the functional core must stay pure: no DOM, no storage, no
// ambient time or randomness, no imports from the imperative shell.
const PURE_CORE = ['js/fp/**/*.js', 'js/domain/**/*.js'];

export default [
  {
    // Global ignores (an entry with only `ignores` applies to every config):
    // worktrees under .claude/ carry their own dist/ and node_modules.
    ignores: ['**/node_modules/**', '**/dist/**', 'coverage/**', '.claude/**'],
  },
  {
    files: ['**/*.js'],

    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },

    plugins: {
      prettier,
    },

    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'no-param-reassign': 'error',
      'prefer-const': 'error',
    },
  },

  {
    files: PURE_CORE,
    rules: {
      'no-param-reassign': ['error', { props: true }],
      'no-restricted-globals': [
        'error',
        'document',
        'window',
        'localStorage',
        'sessionStorage',
        'location',
        'navigator',
        'confirm',
        'prompt',
        'alert',
        'crypto',
        'setTimeout',
        'setInterval',
        'requestAnimationFrame',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random' },
        { object: 'Date', property: 'now' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/ports/**',
                '**/app/**',
                '**/views/**',
                '**/services/**',
                '**/core/**',
                '**/effects/browserInterpreter*',
              ],
              message:
                'The functional core (fp/, domain/) must not import from the imperative shell.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.node,
      },
    },
  },

  {
    files: ['tests/**/*.js', 'vitest.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
];
