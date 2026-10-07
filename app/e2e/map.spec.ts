import { expect, test } from '@playwright/test';
import { createProfile, loadPreset, mapStates, playUntil } from './helpers.ts';

test.beforeEach(async ({ page }) => {
  await createProfile(page, '?debug=1');
});

test('el mapa muestra cada estado posible con los presets de debug', async ({ page }) => {
  expect(await mapStates(page)).toEqual([
    'Mundo 1, La Sílaba que Ronronea, disponible',
    'Mundo 2, El Tejado Puntiagudo, bloqueado',
    'Mundo 3, Las Llanuras de la Siesta, bloqueado',
    'Mundo 4, El Árbol Trepador, bloqueado',
    'Mundo 5, El Mercado de los Ovillos, bloqueado',
    'Mundo 6, El Río de los Abrazos, bloqueado',
    'Mundo 8, La Casa de los Gemelos, bloqueado',
    'Mundo 7, El Puente Roto, bloqueado',
    'Mundo 9, El Bosque de las Preguntas, bloqueado',
    'Mundo 10, La Torre de la Gata Sabia, bloqueado',
  ]);

  await page.goto('/');
  await loadPreset(page, 'Primera bifurcación (2 completo, 3 en curso, 4 nuevo)');
  const fork = await mapStates(page);
  expect(fork.slice(0, 5)).toEqual([
    'Mundo 1, La Sílaba que Ronronea, completo, 2 de 3 estrellas',
    'Mundo 2, El Tejado Puntiagudo, completo, 3 de 3 estrellas',
    'Mundo 3, Las Llanuras de la Siesta, en curso',
    'Mundo 4, El Árbol Trepador, disponible',
    'Mundo 5, El Mercado de los Ovillos, bloqueado',
  ]);
  await expect(page.getByRole('img', { name: 'Estás acá' })).toBeVisible();

  await page.goto('/');
  await loadPreset(page, 'Segunda bifurcación (6 en curso, 8 nuevo)');
  const road = await mapStates(page);
  expect(road.slice(5, 9)).toEqual([
    'Mundo 6, El Río de los Abrazos, en curso',
    'Mundo 8, La Casa de los Gemelos, disponible',
    'Mundo 7, El Puente Roto, bloqueado',
    'Mundo 9, El Bosque de las Preguntas, bloqueado',
  ]);
});

test('ganar el jefe del mundo 1 abre 2, 3 y 4 a la vez; el 5 sigue cerrado', async ({ page }) => {
  await loadPreset(page, 'Jefe del mundo 1 habilitado');
  await page.getByRole('link', { name: '¡Desafiar al jefe!' }).click();
  await playUntil(page, '¡Le ganaste al jefe!', { world: 1, correct: true });
  await expect(
    page.getByText(
      /Se abrieron El Tejado Puntiagudo, Las Llanuras de la Siesta, El Árbol Trepador/,
    ),
  ).toBeVisible();

  const states = await mapStates(page);
  expect(states.slice(1, 5)).toEqual([
    'Mundo 2, El Tejado Puntiagudo, disponible',
    'Mundo 3, Las Llanuras de la Siesta, disponible',
    'Mundo 4, El Árbol Trepador, disponible',
    'Mundo 5, El Mercado de los Ovillos, bloqueado',
  ]);
});

test('perder contra el jefe no hace perder nada', async ({ page }) => {
  await loadPreset(page, 'Jefe del 4 habilitado (2 y 3 vencidos)');
  await page.getByRole('link', { name: '¡Desafiar al jefe!' }).click();
  await playUntil(page, '¡Casi!', { world: 4, correct: false });
  await expect(page.getByText('No perdiste nada')).toBeVisible();

  // Sigue en curso, con sus paradas, y el jefe sigue habilitado.
  const states = await mapStates(page);
  expect(states[3]).toBe('Mundo 4, El Árbol Trepador, en curso');
  await page.goto('/mundo/4');
  await expect(page.getByLabel('Desafío, completa')).toBeVisible();
  await expect(page.getByLabel('Jefe, la que sigue')).toBeVisible();
});
