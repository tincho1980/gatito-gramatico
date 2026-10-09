import { expect, test, type Browser, type Page } from '@playwright/test';
import { createProfile, playUntil } from './helpers.ts';

// Cada "celular" es un contexto nuevo del navegador, con su propia IP (para el límite de
// ingresos por IP de la API local).
let ip = 0;
async function phone(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 360, height: 740 },
    extraHTTPHeaders: { 'X-Forwarded-For': `10.1.${Math.floor(++ip / 250)}.${ip % 250}` },
  });
  return context.newPage();
}

async function adultLogin(page: Page, email: string, role: 'Soy familia' | 'Soy docente') {
  await page.goto('/adultos');
  await page.getByRole('textbox', { name: 'O con tu email' }).fill(email);
  await page.getByRole('button', { name: 'Entrar (prueba local)' }).click();
  await page.getByRole('button', { name: new RegExp(role) }).click();
}

async function joinClassroom(page: Page, code: string, alias: string, pin: string) {
  await page.goto('/entrar-al-aula');
  await page.getByRole('textbox', { name: 'Código del aula' }).fill(code);
  await page.getByRole('textbox', { name: 'Tu apodo' }).fill(alias);
  await page.getByLabel('Tu PIN').fill(pin);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test('un docente crea un aula, tres chicos entran desde tres celulares y aparecen en el tablero', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const teacher = await phone(browser);
  await adultLogin(teacher, `docente-${Date.now()}@escuela.test`, 'Soy docente');
  await teacher.getByRole('textbox', { name: 'Crear un aula' }).fill('4.º B');
  await teacher.getByRole('button', { name: 'Crear aula' }).click();
  const codeLabel = await teacher.getByLabel(/^Código [A-Z ]+$/).getAttribute('aria-label');
  const code = codeLabel!.replace('Código ', '').replaceAll(' ', '');
  expect(code).toMatch(/^[A-Z]{6}$/);

  // Mica ya jugaba como invitada: entra al aula con su progreso.
  const mica = await phone(browser);
  await createProfile(mica);
  await mica.getByRole('link', { name: 'Jugar' }).click();
  await mica.getByRole('button', { name: 'Practicar' }).click();
  await playUntil(mica, '¡Lección lista!', { world: 1, correct: false });
  await mica.getByRole('button', { name: 'Ir a la práctica' }).click();
  await playUntil(mica, 'Seguir jugando', { world: 1, correct: true });
  await joinClassroom(mica, code.toLowerCase(), 'Michi', '1234');
  await expect(mica.getByText('Todo guardado en la nube')).toBeVisible();

  // Tomi y Juli entran desde cero, sin perfil en el celular.
  for (const alias of ['Tomi', 'Juli']) {
    const kid = await phone(browser);
    await joinClassroom(kid, code, alias, '4321');
    await expect(kid.getByRole('heading', { name: `¡Hola, ${alias}!` })).toBeVisible();
  }

  await teacher.getByRole('link', { name: 'Ver el tablero' }).click();
  await expect(teacher.getByText('3 alumnos')).toBeVisible();
  const rows = teacher.getByRole('table').getByRole('row');
  await expect(rows.filter({ hasText: 'Michi' })).toContainText('Hoy');
  await expect(rows.filter({ hasText: 'Tomi' })).toContainText('Nunca');
  // Michi jugó el mundo 1: tiene dominio en alguna regla, no "Sin jugar" en todas.
  await expect(rows.filter({ hasText: 'Michi' })).toContainText('%');
  await expect(teacher.getByRole('status').filter({ hasText: /repasar|domina/ })).toBeVisible();

  // Abrir un mundo para el aula.
  teacher.once('dialog', (d) => void d.accept());
  await teacher.getByLabel('Mundo para abrir').selectOption('5');
  await teacher.getByRole('button', { name: 'Abrir' }).click();
  await expect(teacher.getByText(/Ya abiertos: El Mercado de los Ovillos/)).toBeVisible();

  // Michi lo ve al volver a abrir la app (se sincroniza y trae el cambio).
  await mica.goto('/mapa');
  await expect(mica.getByLabel(/^Mundo 5, El Mercado de los Ovillos, disponible/)).toBeVisible();
});

test('con el mismo apodo y PIN, el chico recupera su perfil en otro celular', async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const teacher = await phone(browser);
  await adultLogin(teacher, `docente2-${Date.now()}@escuela.test`, 'Soy docente');
  await teacher.getByRole('textbox', { name: 'Crear un aula' }).fill('5.º A');
  await teacher.getByRole('button', { name: 'Crear aula' }).click();
  const label = await teacher.getByLabel(/^Código [A-Z ]+$/).getAttribute('aria-label');
  const code = label!.replace('Código ', '').replaceAll(' ', '');

  const first = await phone(browser);
  await joinClassroom(first, code, 'Lola', '2468');
  await first.getByRole('link', { name: 'Jugar' }).click();
  await first.getByRole('button', { name: 'Practicar' }).click();
  await playUntil(first, '¡Lección lista!', { world: 1, correct: false });
  await first.goto('/');
  await expect(first.getByText('Todo guardado en la nube')).toBeVisible();

  const second = await phone(browser);
  await joinClassroom(second, code, 'lola', '1111');
  await expect(second.getByRole('alert')).toHaveText('El apodo o el PIN no coinciden.');
  await second.getByLabel('Tu PIN').fill('2468');
  await second.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(second.getByRole('heading', { name: '¡Hola, Lola!' })).toBeVisible();
  await second.goto('/mundo/1');
  await expect(second.getByLabel('Lección, completa')).toBeVisible();
});

test('una familia guarda el perfil en su cuenta y lo trae a otro dispositivo', async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const email = `familia-${Date.now()}@casa.test`;
  const home = await phone(browser);
  await createProfile(home);
  await home.getByRole('link', { name: 'Jugar' }).click();
  await home.getByRole('button', { name: 'Practicar' }).click();
  await playUntil(home, '¡Lección lista!', { world: 1, correct: false });
  await adultLogin(home, email, 'Soy familia');
  await home.getByRole('button', { name: 'Guardar en mi cuenta' }).click();
  await expect(home.getByText('☁️ En tu cuenta')).toBeVisible();

  // No deja repetir un apodo de la cuenta.
  await home.getByRole('textbox', { name: 'Apodo' }).fill('michi');
  await home.getByRole('button', { name: 'Crear' }).click();
  await expect(home.getByText('Ya tenés un perfil con ese apodo.')).toBeVisible();

  // En otro dispositivo, el adulto entra desde la bienvenida sin crear un perfil.
  const tablet = await phone(browser);
  await tablet.goto('/');
  await tablet.getByRole('link', { name: 'Soy adulto: familias y docentes' }).click();
  await tablet.getByRole('textbox', { name: 'O con tu email' }).fill(email);
  await tablet.getByRole('button', { name: 'Entrar (prueba local)' }).click();
  await tablet.getByRole('button', { name: 'Jugar acá' }).click();
  await expect(tablet.getByRole('heading', { name: '¡Hola, Michi!' })).toBeVisible();
  await expect(tablet.getByText('Todo guardado en la nube')).toBeVisible();
  await tablet.goto('/mundo/1');
  await expect(tablet.getByLabel('Lección, completa')).toBeVisible();
});

test('la familia borra un perfil de su cuenta con todo su progreso', async ({ browser }) => {
  const page = await phone(browser);
  await createProfile(page);
  await adultLogin(page, `borrar-${Date.now()}@casa.test`, 'Soy familia');
  await page.getByRole('button', { name: 'Guardar en mi cuenta' }).click();
  await expect(page.getByText('☁️ En tu cuenta')).toBeVisible();
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Borrar a Michi' }).click();
  await expect(
    page.getByRole('status', { name: 'Avisos' }).getByText('Se borró Michi'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Borrar a Michi' })).toHaveCount(0);
  // Sin perfiles, la app vuelve a la bienvenida.
  await page.goto('/');
  await expect(page.getByPlaceholder('Por ejemplo, Michi')).toBeVisible();
});

test('una misma cuenta es familia y docente: el selector cambia de panel', async ({ browser }) => {
  const page = await phone(browser);
  await adultLogin(page, `ambas-${Date.now()}@casa.test`, 'Soy familia');
  await expect(page.getByRole('heading', { name: 'Crear un perfil' })).toBeVisible();
  await page.getByRole('tab', { name: '🏫 Docente' }).click();
  await page.getByRole('textbox', { name: 'Crear un aula' }).fill('Taller de lectura');
  await page.getByRole('button', { name: 'Crear aula' }).click();
  await expect(page.getByRole('heading', { name: 'Taller de lectura' })).toBeVisible();
  // La preferencia queda guardada: al volver, abre el panel docente.
  await page.reload();
  await expect(page.getByRole('tab', { name: '🏫 Docente' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.getByRole('tab', { name: '🏠 Familia' }).click();
  await expect(page.getByRole('heading', { name: 'Crear un perfil' })).toBeVisible();
});
