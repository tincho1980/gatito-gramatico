import { expect, test } from '@playwright/test';
import { createProfile, loadPreset } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await createProfile(page, '?debug=1');
  await loadPreset(page, 'Con premios (100 croquetas, 3 gatos amigos, insignias)');
  await expect(page.getByLabel('100 croquetas')).toBeVisible();
});

test('comprar un accesorio, ponérselo y que quede guardado', async ({ page }) => {
  await page.getByRole('link', { name: 'Tienda' }).click();

  // Lo que no alcanza no se puede comprar.
  await page.getByRole('button', { name: /Gorro de mago/ }).click();
  await expect(page.getByRole('button', { name: 'Comprar por 120 🐟' })).toBeDisabled();
  await expect(page.getByText('Te faltan 20 croquetas')).toBeVisible();

  await page.getByRole('button', { name: /Moño rosa/ }).click();
  await expect(page.getByRole('img', { name: 'La gatita con Moño rosa' })).toBeVisible();
  await page.getByRole('button', { name: 'Comprar por 20 🐟' }).click();
  await expect(
    page.getByRole('status', { name: 'Avisos' }).getByText('¡Compraste Moño rosa!'),
  ).toBeVisible();
  await expect(page.locator('header').getByLabel('80 croquetas')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dejar de usar: Moño rosa' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /Moño rosa.*Puesto/ })).toBeVisible();
  await page.goto('/');
  await expect(page.getByLabel('80 croquetas')).toBeVisible();
});

test('los gatos amigos y las insignias, con las secretas escondidas', async ({ page }) => {
  await page.getByRole('link', { name: 'Colección' }).click();
  await expect(page.getByText('Gatos amigos 3 de 8')).toBeVisible();
  await expect(page.getByLabel('Gato de tejado')).toBeVisible();
  await expect(page.getByLabel('Sin descubrir: jefe de El Mercado de los Ovillos')).toBeVisible();
  await expect(page.getByText('Cazadora de agudas')).toBeVisible();
  await expect(page.getByText('Insignia secreta')).toBeVisible();
  await expect(page.getByText('Gata trasnochadora')).toHaveCount(0);
});

test('el progreso muestra una barra por regla', async ({ page }) => {
  await page.getByRole('link', { name: 'Progreso' }).click();
  await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible();
  const agudas = page
    .getByRole('region', { name: 'El Tejado Puntiagudo' })
    .getByRole('progressbar', { name: 'Agudas que terminan en n, s o vocal' });
  await expect(agudas).toHaveAttribute('aria-valuenow', '95');
});
