import { expect, type Locator, type Page } from '@playwright/test';

interface Entry {
  word: string;
  stressIndex: number;
  type: string;
  hasTilde: boolean;
  sentence: string | null;
}

const strip = (s: string) => s.normalize('NFD').replace(/́/g, '').normalize('NFC');

export async function createProfile(page: Page, query = '') {
  await page.goto(`/${query}`);
  await page.getByPlaceholder('Por ejemplo, Michi').fill('Michi');
  await page.getByText('Naranja').click();
  await page.getByRole('button', { name: '¡A jugar!' }).click();
  await expect(page.getByRole('heading', { name: '¡Hola, Michi!' })).toBeVisible();
}

export async function loadPreset(page: Page, name: string) {
  await page.getByText('Debug: cargar estado').click();
  await page.getByRole('button', { name }).click();
}

/** Estados de los mundos en el mapa, desde los aria-label. */
export async function mapStates(page: Page): Promise<string[]> {
  await page.goto('/mapa');
  await expect(page.getByRole('listitem').first()).toBeVisible();
  return page
    .getByRole('listitem')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
}

async function tryClick(locator: Locator) {
  try {
    await locator.click({ timeout: 3000 });
  } catch {
    // la pantalla cambió: el loop vuelve a mirar
  }
}

const TYPE_LABEL: Record<string, string> = {
  aguda: 'Aguda',
  grave: 'Grave',
  esdrujula: 'Esdrújula',
  sobreesdrujula: 'Sobreesdrújula',
};

/**
 * Juega turnos hasta que aparezca `until`. Con `correct`, responde bien buscando la palabra
 * en el banco del mundo; si no, siempre la última opción.
 */
export async function playUntil(
  page: Page,
  until: string,
  { world, correct }: { world: number; correct: boolean },
) {
  const bank = correct
    ? (
        (await (
          await page.request.get(`/words/world-${String(world).padStart(2, '0')}.json`)
        ).json()) as {
          words: Entry[];
        }
      ).words
    : [];
  const choices = page.getByTestId('choices').getByRole('button');
  const next = page.getByRole('button', { name: 'Seguir' });
  const done = page.getByText(until);

  for (let i = 0; i < 80; i++) {
    await expect(choices.first().or(next).or(done)).toBeVisible();
    if (await done.isVisible()) return;
    // La pantalla puede cambiar entre ver un botón y tocarlo (por ejemplo, al guardar después
    // del último "Seguir"): si el clic no llega, se vuelve a mirar qué hay.
    if (await next.isVisible()) {
      await tryClick(next);
      continue;
    }
    if (!correct) {
      await tryClick(choices.last());
      continue;
    }
    const mark = page.locator('main mark');
    const prompt = (await page.locator('main h2').textContent()) ?? '';
    let entry: Entry | undefined;
    if (await mark.count()) {
      const shown = await mark.textContent();
      entry = bank.find(
        (w) => w.sentence && strip(w.sentence.match(/\[([^\]]+)\]/)![1]!) === shown,
      );
    } else {
      const shown =
        (await page.locator('main p.font-heading').first().getAttribute('aria-label')) ??
        (await page.locator('main p.font-heading').first().textContent());
      entry = bank.find((w) => strip(w.word) === shown);
    }
    if (!entry) throw new Error('No encontré la palabra en el banco');
    if (prompt.startsWith('Tocá')) await choices.nth(entry.stressIndex).click();
    else if (prompt.startsWith('¿Qué tipo'))
      await page.getByRole('button', { name: TYPE_LABEL[entry.type] }).click();
    else
      await page.getByRole('button', { name: entry.hasTilde ? 'Con tilde' : 'Sin tilde' }).click();
  }
  throw new Error(`No apareció "${until}"`);
}
