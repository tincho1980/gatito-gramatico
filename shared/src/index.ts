// Lógica pura del juego, compartida entre `app` y `api`. Sin DOM ni red.
// El motor llega en la etapa 2 (ver docs/plan-de-desarrollo.md).

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));
