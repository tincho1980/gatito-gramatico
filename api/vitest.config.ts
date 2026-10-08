import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // Cada archivo levanta su propio Postgres embebido.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
