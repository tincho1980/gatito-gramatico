// Lógica pura del juego, compartida entre `app` y `api`. Sin DOM ni red
// (salvo el loader del banco, que recibe `fetch` inyectado).

export * from './data/worlds.ts';
export * from './schemas.ts';
export * from './words/loader.ts';
