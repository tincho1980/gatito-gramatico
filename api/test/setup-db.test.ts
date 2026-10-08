import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  currentHyperdriveId,
  parseAdminUrl,
  parseHyperdriveId,
  PLACEHOLDER_ID,
  updateWranglerConfig,
  workerConnectionString,
} from '../scripts/setup-db-lib.ts';

const REF = 'abcdefghijklmnopqrst';
const POOLER = `postgresql://postgres.${REF}:secreto@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`;
const CONFIG = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');

describe('setup-db', () => {
  it('lee el proyecto de la conexión del Session pooler', () => {
    expect(parseAdminUrl(POOLER).ref).toBe(REF);
  });

  it('rechaza la conexión directa, el Transaction pooler o una URL sin contraseña', () => {
    expect(() =>
      parseAdminUrl(`postgresql://postgres:x@db.${REF}.supabase.co:5432/postgres`),
    ).toThrow(/Session pooler/);
    expect(() =>
      parseAdminUrl(
        `postgresql://postgres.${REF}:x@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
      ),
    ).toThrow(/Session pooler/);
    expect(() =>
      parseAdminUrl(
        `postgresql://postgres.${REF}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
      ),
    ).toThrow(/contraseña/);
    expect(() => parseAdminUrl('no es una url')).toThrow(/válida/);
  });

  it('arma la conexión del Worker con su rol y la contraseña nueva', () => {
    expect(workerConnectionString(parseAdminUrl(POOLER), 'nueva_123-x')).toBe(
      `postgresql://gatita_worker.${REF}:nueva_123-x@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`,
    );
  });

  it('lee el id que imprime wrangler hyperdrive create', () => {
    const id = '0123456789abcdef0123456789abcdef';
    expect(
      parseHyperdriveId(
        `✅ Created\n{\n  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "${id}" }]\n}`,
      ),
    ).toBe(id);
    expect(parseHyperdriveId('sin id')).toBeNull();
  });

  it('actualiza producción en wrangler.jsonc sin tocar lo local ni los comentarios', () => {
    const id = '0123456789abcdef0123456789abcdef';
    // El wrangler.jsonc del repo, con producción todavía sin configurar (como antes del script).
    const example = updateWranglerConfig(CONFIG, {
      hyperdriveId: PLACEHOLDER_ID,
      supabaseUrl: 'https://REEMPLAZAR.supabase.co',
    });
    expect(currentHyperdriveId(example)).toBeNull();
    const updated = updateWranglerConfig(example, {
      hyperdriveId: id,
      supabaseUrl: `https://${REF}.supabase.co`,
    });
    expect(currentHyperdriveId(updated)).toBe(id);
    expect(updated).toContain(`"SUPABASE_URL": "https://${REF}.supabase.co"`);
    // Lo local queda igual: la base de `supabase start`.
    expect(updated).toContain('"SUPABASE_URL": "http://127.0.0.1:54321"');
    expect(updated).toContain('"localConnectionString"');
    expect(updated.match(/"id": "0{32}"/g)).toHaveLength(1); // el id local de ejemplo
    expect(updated.split('\n').filter((l) => l.trim().startsWith('//'))).toEqual(
      CONFIG.split('\n').filter((l) => l.trim().startsWith('//')),
    );
  });
});
