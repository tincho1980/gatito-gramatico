import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-e2e/**',
      '**/node_modules/**',
      'words/bank/**',
      'app/public/words/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['app/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['**/*.{js,mjs}', '**/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // shared/ es lógica pura: sin DOM, sin Node y sin reloj ni azar implícitos.
    files: ['shared/src/**/*.ts'],
    ignores: ['shared/src/**/*.test.ts', 'shared/src/engine/testing.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['node:*'] }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'fetch', 'process'],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'Las fechas entran como argumento.' },
        { object: 'Math', property: 'random', message: 'Usá el rng con semilla.' },
      ],
    },
  },
  prettier,
);
