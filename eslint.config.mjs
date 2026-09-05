import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'allure-results/**',
      'allure-report/**',
      'playwright/.auth/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  /* The flat config itself is plain ESM and is not part of the TS project. */
  {
    files: ['**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: { project: './tsconfig.json' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  /* Playwright rules apply to specs only - they catch the classic test smells:
     missing `await` on expects, hard waits, conditionals in tests. */
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-skipped-test': 'warn',
      'playwright/expect-expect': [
        'error',
        // Page-object assertion helpers (appointmentPage.expectConfirmationMatches,
        // loginPage.expectLoginFailed, ...) are real assertions - teach the rule
        // to recognise anything named `expect*` or `<object>.expect*`.
        { assertFunctionPatterns: ['(^|\\.)expect'] },
      ],
    },
  },

  prettier
);
