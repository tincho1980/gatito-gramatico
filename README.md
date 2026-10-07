# La Gatita Gramática

Juego web (PWA, mobile first, offline-first) para practicar acentuación en español, pensado para chicos y adolescentes y para usar en el aula.

## Requisitos

- Node 22 (está en `.nvmrc`: `nvm use`).

## Levantar el proyecto

```bash
npm install
npm run dev -w app
```

La app queda en http://localhost:3000. No hace falta ninguna clave ni archivo `.env`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev -w app` | App en desarrollo |
| `npm run typecheck` | `tsc` en todos los workspaces |
| `npm run lint` | ESLint + chequeo de Prettier |
| `npm run format` | Formatea con Prettier |
| `npm test` | Tests (Vitest) de todos los workspaces |
| `npm run test:e2e -w app` | Tests e2e con Playwright (la primera vez: `npx playwright install chromium` en `app/`) |
| `npm run build` | Build de todos los workspaces |
| `npm run build -w words` | Regenera el banco de palabras |
| `npm run validate -w words` | Valida el banco publicado |
| `npm run check:secrets` | Busca claves en `app/dist` (corre en CI después del build) |

## Estructura

Monorepo con npm workspaces:

- `app/`: la PWA (React + Vite + Tailwind).
- `shared/`: lógica pura del juego y tipos, sin DOM ni red. La usan `app` y `api`.
- `api/`: Cloudflare Worker (etapa 7).
- `words/`: banco de palabras. Se editan los `.txt` de `words/src/` y se corre `npm run build -w words`, que regenera `words/bank/` y `app/public/words/`.

## Documentación

- [Plan de desarrollo](docs/plan-de-desarrollo.md)
- [Especificación del juego](docs/especificacion-del-juego.md)
- [Arquitectura](docs/arquitectura.md)
- [Banco de palabras](docs/banco-de-palabras.md)
