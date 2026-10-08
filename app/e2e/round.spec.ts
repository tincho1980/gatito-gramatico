import { expect, test } from '@playwright/test';
import { createProfile, playUntil } from './helpers.ts';

test('crear perfil, hacer la lección y jugar una ronda completa', async ({ page }) => {
  await createProfile(page);

  // §7.2 "Jugar" con un perfil nuevo: la lección del mundo 1.
  await page.getByRole('link', { name: 'Jugar' }).click();
  await expect(page.getByRole('heading', { name: 'La sílaba que ronronea' })).toBeVisible();
  await page.getByRole('button', { name: 'Practicar' }).click();
  await playUntil(page, '¡Lección lista!', { world: 1, correct: false });
  await page.getByRole('button', { name: 'Ir a la práctica' }).click();

  // Ronda de práctica, sin scroll durante el turno.
  const choices = page.getByTestId('choices').getByRole('button');
  await expect(choices.first()).toBeVisible();
  const { scroll, height } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    height: window.innerHeight,
  }));
  expect(scroll).toBeLessThanOrEqual(height);
  await playUntil(page, 'Seguir jugando', { world: 1, correct: false });

  await expect(page.getByText('Completas')).toBeVisible();
  await expect(page.getByRole('listitem').getByText('Nueva insignia: Primera ronda')).toBeVisible();
  // El aviso aparece arriba, sobre la pantalla (plan, etapa 5).
  await expect(
    page.getByRole('status', { name: 'Avisos' }).getByText('Nueva insignia: Primera ronda'),
  ).toBeVisible();

  // El progreso sigue después de recargar.
  await page.goto('/mundo/1');
  await page.reload();
  await expect(page.getByLabel('Lección, completa')).toBeVisible();
});

test('el alias no acepta un email', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Por ejemplo, Michi').fill('mica@mail.com');
  await page.getByRole('button', { name: '¡A jugar!' }).click();
  await expect(page.getByText('No pongas un email: inventá un apodo.')).toBeVisible();
});
