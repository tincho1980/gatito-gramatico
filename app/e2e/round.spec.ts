import { expect, test, type Page } from '@playwright/test';

async function createProfile(page: Page) {
  await page.goto('/');
  await page.getByPlaceholder('Por ejemplo, Michi').fill('Michi');
  await page.getByText('Naranja').click();
  await page.getByRole('button', { name: '¡A jugar!' }).click();
  await expect(page.getByRole('heading', { name: '¡Hola, Michi!' })).toBeVisible();
}

/** Juega una ronda respondiendo siempre la primera opción. */
async function playRound(page: Page) {
  const choice = page.getByTestId('choices').getByRole('button').first();
  const next = page.getByRole('button', { name: 'Seguir' });
  const done = page.getByRole('button', { name: 'Otra ronda' });
  for (let i = 0; i < 60; i++) {
    await expect(choice.or(next).or(done)).toBeVisible();
    if (await done.isVisible()) return;
    if (await next.isVisible()) {
      await next.click();
      continue;
    }
    // Durante el turno no hay scroll.
    const { scroll, height } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollHeight,
      height: window.innerHeight,
    }));
    expect(scroll).toBeLessThanOrEqual(height);
    await choice.click();
  }
  throw new Error('La ronda no terminó');
}

test('crear perfil y jugar una ronda completa', async ({ page }) => {
  await createProfile(page);
  await page.getByRole('link', { name: 'Jugar' }).click();
  await playRound(page);

  await expect(page.getByText('Completas')).toBeVisible();
  await expect(page.getByText(/\/ 1[01]$/)).toBeVisible();
  await expect(page.getByText('Nueva insignia: Primera ronda')).toBeVisible();

  // El progreso sigue después de recargar.
  await page.getByRole('button', { name: 'Volver al inicio' }).click();
  await page.reload();
  const rounds = page.locator('dt', { hasText: 'Rondas' }).locator('xpath=following-sibling::dd');
  await expect(rounds).toHaveText('1');
});

test('el alias no acepta un email', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Por ejemplo, Michi').fill('mica@mail.com');
  await page.getByRole('button', { name: '¡A jugar!' }).click();
  await expect(page.getByText('No pongas un email: inventá un apodo.')).toBeVisible();
});
