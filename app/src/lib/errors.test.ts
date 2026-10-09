import { describe, expect, it } from 'vitest';
import { buildReport, cleanPath, scrub } from './errors.ts';

describe('reportes de error sin datos personales', () => {
  it('la ruta va sin ids', () => {
    expect(cleanPath('/aula/3f2a1b4c-1d2e-4f30-8a1b-2c3d4e5f6a7b')).toBe('/aula/:id');
    expect(cleanPath('/mundo/3')).toBe('/mundo/3');
  });

  it('saca parámetros de URLs, emails y tokens', () => {
    expect(scrub('fallo en https://x.dev/adultos?code=abc#access_token=1 al cargar', 200)).toBe(
      'fallo en https://x.dev/adultos al cargar',
    );
    expect(scrub('no existe ana@mail.com', 200)).toBe('no existe [email]');
    expect(scrub('token eyJhbGci.eyJzdWIi.firma inválido', 200)).toBe('token [token] inválido');
    expect(scrub('x'.repeat(500), 300)).toHaveLength(300);
  });

  it('arma el reporte con mensaje, stack corto, ruta y versión', () => {
    const r = buildReport(new Error('boom'), 'render', '/mundo/2');
    expect(r).toMatchObject({ message: 'boom', path: '/mundo/2', kind: 'render' });
    expect(r.stack!.split('\n').length).toBeLessThanOrEqual(10);
    expect(buildReport('texto suelto', 'rejection', '/').message).toBe('texto suelto');
  });
});
