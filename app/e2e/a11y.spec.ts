import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { createProfile } from './helpers.ts';

// Accesibilidad (plan, etapa 9): WCAG 2.1 A y AA en las pantallas principales.
async function audit(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map(
      (n) => `${n.target.join(' ')} — ${n.failureSummary?.split('\n')[1]?.trim()}`,
    ),
  }));
}

test('pantallas del chico sin problemas de accesibilidad', async ({ page }) => {
  await page.goto('/');
  expect(await audit(page)).toEqual([]);
  await createProfile(page);
  for (const path of [
    '/',
    '/mapa',
    '/mundo/1',
    '/mundo/1/leccion',
    '/tienda',
    '/coleccion',
    '/progreso',
    '/perfil',
    '/entrar-al-aula',
    '/privacidad',
    '/terminos',
  ]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await audit(page), path).toEqual([]);
  }
});

test('el turno y la lección, sin problemas de accesibilidad', async ({ page }) => {
  await createProfile(page);
  await page.goto('/mundo/1/leccion');
  await page.getByRole('button', { name: 'Practicar' }).click();
  await expect(page.getByTestId('choices')).toBeVisible();
  expect(await audit(page), 'turno').toEqual([]);
  await page.getByTestId('choices').getByRole('button').first().click();
  expect(await audit(page), 'después de responder').toEqual([]);
});

test('pantallas de adultos sin problemas de accesibilidad', async ({ page }) => {
  await page.goto('/adultos');
  await expect(page.getByRole('button', { name: 'Entrar (prueba local)' })).toBeVisible();
  expect(await audit(page), 'login').toEqual([]);
  await page
    .getByRole('textbox', { name: 'O con tu email' })
    .fill(`a11y-${Date.now()}@escuela.test`);
  await page.getByRole('button', { name: 'Entrar (prueba local)' }).click();
  await expect(page.getByRole('button', { name: /Soy docente/ })).toBeVisible();
  expect(await audit(page), 'rol').toEqual([]);
  await page.getByRole('button', { name: /Soy docente/ }).click();
  await page.getByRole('textbox', { name: 'Crear un aula' }).fill('4.º B');
  await page.getByRole('button', { name: 'Crear aula' }).click();
  await expect(page.getByRole('link', { name: 'Ver el tablero' })).toBeVisible();
  expect(await audit(page), 'docente').toEqual([]);
  await page.getByRole('link', { name: 'Ver el tablero' }).click();
  await expect(page.getByText('Todavía no entró nadie')).toBeVisible();
  expect(await audit(page), 'tablero').toEqual([]);
  await page.goto('/revision');
  await expect(page.getByText(/palabras$/).first()).toBeVisible();
  expect(await audit(page), 'revisión').toEqual([]);
});

test('letra grande: se activa en el perfil y el turno sigue entrando sin scroll', async ({
  page,
}) => {
  await createProfile(page);
  await page.goto('/perfil');
  // El interruptor refleja lo guardado (se actualiza al guardarse): click y esperar.
  await page.getByRole('switch', { name: 'Letra más grande' }).click();
  await expect(page.getByRole('switch', { name: 'Letra más grande' })).toBeChecked();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.fontSize))
    .toBe('118.75%');
  await page.goto('/mundo/1/leccion');
  await page.getByRole('button', { name: 'Practicar' }).click();
  await expect(page.getByTestId('choices')).toBeVisible();
  const { scroll, height } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    height: window.innerHeight,
  }));
  expect(scroll).toBeLessThanOrEqual(height);
});

test('con teclado: el foco pasa a la consigna en cada paso', async ({ page }) => {
  await createProfile(page);
  await page.goto('/mundo/1/leccion');
  await page.getByRole('button', { name: 'Practicar' }).click();
  await expect(page.getByRole('heading', { level: 2 })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^Sílaba 1 de \d+: / })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Seguir' })).toBeFocused();
});
