# La Gatita Gramática

Juego web (PWA, mobile first, offline-first) para practicar acentuación en español, para chicos y adolescentes y para usar en el aula.

## Antes de trabajar

- Leé `docs/plan-de-desarrollo.md` y trabajá la etapa que se indique, en orden de tareas.
- La lógica del juego está definida en `docs/especificacion-del-juego.md`: es la fuente de verdad. Si un caso no está cubierto, preguntá o proponé la regla y agregala a la especificación en el mismo cambio.
- La parte técnica está en `docs/arquitectura.md`.

## Reglas del repo

- Monorepo con npm workspaces: `app` (PWA), `api` (Cloudflare Worker), `shared` (lógica pura y tipos), `words` (banco de palabras).
- `shared/` no depende del DOM ni de la red. Toda la lógica de juego vive ahí y se usa igual en `app` y `api`.
- Las funciones del motor son puras y deterministas: el azar entra por un `rng` con semilla y las fechas vienen como argumento.
- Los números ajustables van en `shared/src/engine/config.ts`, nunca sueltos en el código.
- Nada de IA ni claves en el cliente. El cliente nunca habla directo con la base: todo pasa por el Worker.
- Los chicos nunca ingresan email ni nombre real.
- Textos para el chico en voseo rioplatense.
- Las palabras se editan en `words/src/*.txt` y después se corre `npm run build -w words`. `words/bank/` y `app/public/words/` son generados: no se editan a mano.

## Comandos

```bash
npm install
npm run dev -w app        # app en desarrollo
npm run typecheck
npm run lint
npm test                  # todos los workspaces
npm run build
npm run build -w words    # regenera el banco
```

Una etapa está terminada cuando cumple sus criterios de aceptación y `typecheck`, `lint`, `test` y `build` pasan.
