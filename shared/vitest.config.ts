import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/**/*.test.ts', 'src/engine/testing.ts', 'src/engine/index.ts'],
      reporter: ['text-summary', 'text'],
      // Criterio de la etapa 2: ≥ 90 % de líneas en el motor.
      thresholds: { lines: 90 },
    },
  },
});
