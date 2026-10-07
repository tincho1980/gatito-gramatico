import { describe, expect, it } from 'vitest';
import { aliasProblem, isAvatar, normalizeAlias } from './profile.ts';

describe('alias del chico (arquitectura §9.9)', () => {
  it('acepta apodos comunes', () => {
    for (const a of ['Mica', 'Tomi 2', 'La Gata Flor', "D'Artañán", 'Juli_10']) {
      expect(aliasProblem(a)).toBeNull();
    }
  });

  it('largo entre 2 y 20', () => {
    expect(aliasProblem('a')).toMatch(/al menos 2/);
    expect(aliasProblem('  a  ')).toMatch(/al menos 2/);
    expect(aliasProblem('a'.repeat(21))).toMatch(/hasta 20/);
  });

  it('rechaza emails, URLs y teléfonos', () => {
    expect(aliasProblem('mica@mail.com')).toMatch(/email/);
    expect(aliasProblem('www.gatos.ar')).toMatch(/internet/);
    expect(aliasProblem('mica.com')).toMatch(/internet/);
    expect(aliasProblem('11 4567 8901')).toMatch(/teléfono/);
    expect(aliasProblem('mica <3')).toMatch(/letras/);
  });

  it('normaliza espacios', () => {
    expect(normalizeAlias('  La   Gata ')).toBe('La Gata');
  });

  it('avatares válidos', () => {
    expect(isAvatar('naranja')).toBe(true);
    expect(isAvatar('perro')).toBe(false);
  });
});
