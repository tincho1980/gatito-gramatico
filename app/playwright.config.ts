import { defineConfig, devices } from '@playwright/test';

// e2e contra un build de la app servido por `vite preview`, con la API local (PGlite).
const API = 'http://127.0.0.1:8788';
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  // Celular chico: el turno tiene que entrar sin scroll en 360 px.
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
  ],
  webServer: [
    {
      // La API real sobre Postgres en memoria (PGlite), con login de prueba `local-<uuid>`.
      command: 'npm run dev:local -w api',
      cwd: '..',
      url: `${API}/api/accounts/me`,
      // Sin token responde 401: alcanza para saber que está arriba.
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { GATITA_LOCAL_DB: 'memory', GATITA_LOCAL_PORT: '8788' },
    },
    {
      // Build aparte (dist-e2e) con el login de prueba: nunca se mezcla con el que se publica.
      command:
        'npx vite build --mode localauth --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { GATITA_API_URL: API },
    },
  ],
});
