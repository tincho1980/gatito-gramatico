import { expect, test } from '@playwright/test';
import { createProfile, loadPreset, playUntil } from './helpers.ts';

test('con el service worker instalado, se juega una ronda completa sin red', async ({
  page,
  context,
}) => {
  await createProfile(page);
  // Esperar a que el service worker termine de precachear y controle la página.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: '¡Hola, Michi!' })).toBeVisible();

  await page.getByRole('link', { name: 'Jugar' }).click();
  await page.getByRole('button', { name: 'Practicar' }).click();
  await playUntil(page, '¡Lección lista!', { world: 1, correct: false });
  await page.getByRole('button', { name: 'Ir a la práctica' }).click();
  await playUntil(page, 'Seguir jugando', { world: 1, correct: false });
  await expect(page.getByText('Completas')).toBeVisible();

  // Se guardó: sigue ahí al recargar, todavía sin red.
  await page.goto('/mundo/1');
  await expect(page.getByLabel('Lección, completa')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Nivel')).toBeVisible();
});

test('el manifest permite instalar la app', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = (await (await page.request.get(href!)).json()) as Record<string, unknown>;
  expect(manifest).toMatchObject({
    name: 'La Gatita Gramática',
    short_name: 'Gatita',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
  });
  const icons = manifest.icons as { sizes: string; purpose?: string }[];
  expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);

  // Lo mismo que revisa Lighthouse: Chrome no encuentra nada que impida instalarla.
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
    installabilityErrors: unknown[];
  };
  expect(installabilityErrors).toEqual([]);
});

test('el botón Instalar aparece después de la segunda ronda', async ({ page }) => {
  await createProfile(page, '?debug=1');
  const fakePrompt = () =>
    page.evaluate(() => {
      const e = new Event('beforeinstallprompt') as Event & Record<string, unknown>;
      e.prompt = () => Promise.resolve();
      e.userChoice = Promise.resolve({ outcome: 'dismissed' });
      window.dispatchEvent(e);
    });

  await fakePrompt();
  await expect(page.getByRole('button', { name: 'Ahora no' })).toHaveCount(0); // 0 rondas

  await loadPreset(page, 'Con premios (100 croquetas, 3 gatos amigos, insignias)');
  await expect(page.getByRole('button', { name: 'Instalar' })).toBeVisible();
  await page.getByRole('button', { name: 'Instalar' }).click();
  await expect(page.getByRole('button', { name: 'Instalar' })).toHaveCount(0);

  // "Ahora no" no vuelve a preguntar.
  await fakePrompt();
  await page.getByRole('button', { name: 'Ahora no' }).click();
  await page.reload();
  await fakePrompt();
  await expect(page.getByRole('heading', { name: '¡Hola, Michi!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Instalar' })).toHaveCount(0);
});
