import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  currentHyperdriveId,
  parseAdminUrl,
  parseHyperdriveId,
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

  it('actualiza solo el entorno pedido de wrangler.jsonc y conserva los comentarios', () => {
    const id = '0123456789abcdef0123456789abcdef';
    expect(currentHyperdriveId(CONFIG, 'preview')).toBeNull(); // todavía el de ejemplo
    const updated = updateWranglerConfig(CONFIG, 'preview', {
      hyperdriveId: id,
      supabaseUrl: `https://${REF}.supabase.co`,
    });
    expect(currentHyperdriveId(updated, 'preview')).toBe(id);
    expect(currentHyperdriveId(updated, 'production')).toBeNull();
    expect(updated).toContain(`"SUPABASE_URL": "https://${REF}.supabase.co"`);
    expect(updated).toContain('"SUPABASE_URL": "http://127.0.0.1:54321"'); // local, intacto
    expect(updated).toContain('"SUPABASE_URL": "https://REEMPLAZAR-prod.supabase.co"');
    expect(updated.split('\n').filter((l) => l.trim().startsWith('//'))).toEqual(
      CONFIG.split('\n').filter((l) => l.trim().startsWith('//')),
    );
  });
});
