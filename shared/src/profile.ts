// Perfil del chico: el alias se valida igual en la app y en el Worker (arquitectura §9.9).
// Los chicos nunca dan email ni nombre real: el alias es un apodo corto.

export const ALIAS_MIN = 2;
export const ALIAS_MAX = 20;

/** Gatitos para elegir como avatar. */
export const AVATARS = ['negro', 'naranja', 'gris', 'blanco', 'siames', 'atigrado'] as const;
export type Avatar = (typeof AVATARS)[number];

export const isAvatar = (value: string): value is Avatar =>
  (AVATARS as readonly string[]).includes(value);

/** Devuelve el motivo si el alias no sirve, o `null` si está bien. Textos en voseo. */
export function aliasProblem(raw: string): string | null {
  const alias = raw.trim();
  if (alias.length < ALIAS_MIN) return `Tiene que tener al menos ${ALIAS_MIN} letras.`;
  if (alias.length > ALIAS_MAX) return `Puede tener hasta ${ALIAS_MAX} letras.`;
  if (/@/.test(alias)) return 'No pongas un email: inventá un apodo.';
  if (/(https?:|www\.|\.(com|net|org|ar)\b)/i.test(alias))
    return 'No pongas direcciones de internet.';
  if ((alias.match(/\d/g) ?? []).length >= 6) return 'No pongas números de teléfono.';
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(alias)) return 'Usá letras, números y espacios.';
  return null;
}

/** Alias normalizado para guardar (sin espacios de más). */
export const normalizeAlias = (raw: string): string => raw.trim().replace(/\s+/g, ' ');
