# Plan de desarrollo

Nueve etapas, de la base técnica al MVP. Cada etapa termina con algo que funciona y se puede probar; ninguna deja el repo roto. La lógica del juego se escribe una vez en `shared/` y la usan la app y la API.

Documentos de referencia: [especificacion-del-juego.md](especificacion-del-juego.md) (reglas), [arquitectura.md](arquitectura.md) (técnica), [banco-de-palabras.md](banco-de-palabras.md) (contenido).

## Mapa de etapas

| # | Etapa | Resultado | Depende de |
| --- | --- | --- | --- |
| 0 | Saneamiento y monorepo | Repo limpio, sin Gemini, con CI | — |
| 1 | Banco de palabras integrado | Banco en workspaces, CI y servido por la app | 0 |
| 2 | Motor del juego | Toda la lógica en `shared/`, testeada, sin UI | 1 |
| 3 | Turno y ronda jugables | Se juega una ronda completa, local | 2 |
| 4 | Mapa, mundos y jefe | Se recorre el camino de los 10 mundos | 3 |
| 5 | Premios | XP, racha, croquetas, colección, insignias | 4 |
| 6 | PWA y mobile | Se instala y anda sin red | 3 (puede ir en paralelo a 4–5) |
| 7 | Backend y sincronización | Supabase + Worker; progreso en la nube | 5 |
| 8 | Cuentas y aula | Login adulto, aulas, tablero docente | 7 |
| 9 | Cierre del MVP | Banco ampliado, accesibilidad, piloto | 8 |

**Hito de prueba con chicos:** al terminar la etapa 6 el juego ya es completo para un chico (sin cuentas). Conviene probarlo ahí con algunos chicos antes de construir el backend: los valores ajustables de la especificación se calibran con esa prueba.

## Cómo trabajar con Claude Code

- Una etapa = una rama (`etapa-3-turno-y-ronda`) y uno o más PR. No mezclar etapas.
- Al arrancar cada sesión: "Leé `CLAUDE.md` y `docs/plan-de-desarrollo.md`, y trabajemos la etapa N". Las tareas de cada etapa están en orden.
- La especificación del juego manda. Si al implementar aparece un caso que no cubre, se decide y se agrega a la especificación en el mismo PR.
- Una etapa está terminada cuando se cumplen todos sus criterios de aceptación y CI está en verde.

---

## Etapa 0 — Saneamiento y monorepo

**Objetivo:** dejar una base sana sobre la que construir. Al final, la app vieja sigue andando, pero sin IA, dentro de la estructura nueva.

Tareas:

- [ ] **(Martín, a mano)** Rotar la API key de Gemini en Google AI Studio. La actual quedó embebida en builds anteriores.
- [x] Borrar `services/geminiService.ts`, la dependencia `@google/genai`, el `define` de `process.env` en `vite.config.ts` y la carpeta `dist/`.
- [x] Mientras no exista el motor nuevo, el juego viejo usa un banco mínimo hardcodeado y correcto (sacar el `FALLBACK_POOL` con errores).
- [x] Armar npm workspaces: mover la app actual a `app/`; crear `shared/`, `api/`, `words/` vacíos con su `package.json` y `tsconfig.json`; `tsconfig.base.json` en la raíz con `strict` y `noUncheckedIndexedAccess`.
- [x] Reemplazar Tailwind por CDN por Tailwind v4 con `@tailwindcss/vite`. Mover los estilos inline de `index.html` a `app/src/index.css`.
- [x] Fuentes (Fredoka, Quicksand o las que se definan) servidas localmente con `@fontsource`, no desde Google Fonts (necesario para offline).
- [x] ESLint + Prettier, scripts `typecheck`, `lint`, `test`, `build` en la raíz que corran en todos los workspaces.
- [x] Vitest configurado en `shared/` y `app/`, con un test de ejemplo.
- [x] GitHub Actions: typecheck, lint, test, build y chequeo de claves en `app/dist` (ver arquitectura §9.10).
- [x] `.nvmrc` con Node 22. Actualizar `README.md` con cómo levantar el proyecto.

Criterios de aceptación:

- `npm install && npm run dev -w app` levanta el juego viejo y se puede jugar una ronda.
- `npm run build` no contiene la cadena `AIza` en `app/dist`.
- CI corre en cada PR y está en verde.

---

## Etapa 1 — Banco de palabras integrado

**Objetivo:** que el banco forme parte del monorepo, se valide en CI y la app lo sirva.

Punto de partida: el pipeline completo ya está en `words/` (fuentes `.txt`, motor, build, validador, lexicón y 51 tests en verde). `npm run build` reproduce `words/bank/` sin diferencias. Ver [banco-de-palabras.md](banco-de-palabras.md).

- [x] Sumar `words` a los workspaces de la raíz; `npm test` de la raíz corre también `npm test -w words`.
- [x] Definir en `shared/src/schemas.ts` los esquemas Zod `WordEntrySchema`, `WorldFileSchema` (`{ world, name, topic, words }`) e `IndexSchema`, y sus tipos. `validate.mjs` valida también contra estos esquemas.
- [x] Nombres y temas de los mundos: una sola fuente. Moverlos de `WORLDS` en `words/lib/bank.mjs` a `shared/src/data/worlds.ts` (junto con el grafo de desbloqueo) e importarlos desde ahí.
- [x] `index.json`: `version` pasa a ser un hash del contenido de los mundos (hoy es `1` fijo).
- [x] El build copia `words/bank/*` a `app/public/words/`.
- [x] Agregar a los tests del motor los 8 errores del prototipo viejo, si no están: `mamá`, `lápiz`, `examen`, `gramática`, `agrícola`, `idiosincrasia`, `esternocleidomastoideo`, `electroencefalografista`.
- [x] `npm run validate -w words` en CI.
- [x] Loader en `shared/` (`loadWorld(n)`, `loadIndex()`), con `fetch` inyectable para testear.
- [x] Opcional: pasar `words/lib` a TypeScript (también `scripts/`; queda en Python solo `check-lexicon.py`).

Criterios de aceptación:

- `npm run build -w words` regenera `words/bank/` sin diferencias y deja `app/public/words/` igual.
- Los 8 casos del prototipo viejo salen con la clasificación correcta.
- Editar a mano un `type` en un JSON publicado hace fallar CI.

---

## Etapa 2 — Motor del juego (`shared/`)

**Objetivo:** toda la lógica de la [especificación](especificacion-del-juego.md) como funciones puras y deterministas, con tests. Sin UI ni red.

Módulos en `shared/src/engine/`, en este orden:

- [ ] `config.ts`: los valores ajustables (especificación §10).
- [ ] `rng.ts`: generador con semilla (mulberry32 o similar) y sorteo ponderado.
- [ ] `turn.ts`: pasos según la palabra (§2.1) y evaluación de un turno → `TurnResult`.
- [ ] `ruleTexts.ts`: texto de feedback por `rule` (§2.3), en voseo.
- [ ] `scoring.ts`: XP de una ronda (§3).
- [ ] `leitner.ts`: transición de cajas, `dueRound`, elegibilidad con la regla de 24 h (§5).
- [ ] `mastery.ts`: EMA por regla y jefe habilitado (§6).
- [ ] `worlds.ts`: grafo de mundos como datos, paradas, desbloqueos, estrellas (§7).
- [ ] `round.ts`: armado de la ronda con sus cupos, relleno, penalización y orden (§4.1); ronda del jefe (§4.2); ajuste dentro de la ronda (§4.3) como función `nextWord(roundState, ...)`.
- [ ] `rewards.ts` y `badges.ts`: racha con siesta, croquetas, insignias (§8).
- [ ] `state.ts`: tipo `ProfileState`, `applyRound(state, round, words, config)` y `replay(rounds)`.

Criterios de aceptación:

- Cobertura de líneas ≥ 90 % en `shared/src/engine`.
- Hay un test por cada regla numerada de la especificación (nombrado con el número: `§5.2 caja 4 exige 24 h`).
- `replay` de las mismas rondas da siempre el mismo estado.
- Un test de simulación: un "chico perfecto" que acierta todo llega del mundo 1 al 10 en un número finito de rondas, y uno que acierta el 50 % nunca habilita un jefe.
- `shared/` no importa nada del DOM ni hace `fetch`, salvo el loader inyectable.

---

## Etapa 3 — Turno y ronda jugables (local)

**Objetivo:** reemplazar el juego viejo por el nuevo turno y la nueva ronda. Se juega en el mundo 2 sin mapa todavía.

Tareas:

- [ ] Dexie: esquema de [arquitectura §4](arquitectura.md#4-modelo-de-datos-local-indexeddb) y repositorios (`profilesRepo`, `roundsRepo`, `stateRepo`).
- [ ] Perfil invitado: pantalla de bienvenida con alias + elección de avatar de gatito. Sin email. Borrar `Auth.tsx` y el `localStorage` viejo.
- [ ] Componente de turno: paso `tonica` (sílabas como botones grandes), `tipo`, `tilde`; versión oración para mundos 8–9. Un paso por pantalla, botones en la mitad inferior, mínimo 48 px.
- [ ] Feedback del turno (§2.3) con la gatita y el error común.
- [ ] Ronda: Zustand para el estado en curso; usa `round.ts` para armarla y `nextWord` para el ajuste. Pista visual cuando corresponde.
- [ ] Pantalla de resultados (§4.4).
- [ ] Al terminar, guardar la ronda en Dexie y aplicar `applyRound`.
- [ ] Sonidos (reutilizar `soundService`) y vibración corta, con un interruptor en el perfil.
- [ ] Router con React Router 7.

Criterios de aceptación:

- Se puede jugar una ronda de 10 palabras del mundo 2, ver el feedback de cada una y los resultados.
- Al recargar la página, el progreso sigue (cajas, XP, rondas jugadas).
- En una ronda posterior aparecen como repasos palabras falladas antes.
- Se usa cómodo en 360 px de ancho, sin scroll durante el turno.
- Test e2e (Playwright): crear perfil y jugar una ronda completa.

---

## Etapa 4 — Mapa, mundos y jefe

**Objetivo:** el camino completo de los 10 mundos.

Tareas:

- [ ] Pantalla de mapa vertical con scroll, los 10 mundos con su nombre, las dos bifurcaciones, estados (bloqueado, disponible, en curso, completo con estrellas) y la gatita en el mundo actual.
- [ ] Pantalla de mundo con sus paradas (§7.2) y su estado.
- [ ] Lección de cada mundo: contenido en `app/src/content/lessons/world-XX.ts` (regla + 3 ejemplos + 3 turnos guiados).
- [ ] Jefe: habilitación (§6.2), ronda especial, pantalla de victoria con animación, estrellas y gato amigo; pantalla de derrota con ánimo.
- [ ] Al elegir camino en una bifurcación, el mapa muestra las opciones abiertas sin forzar orden.
- [ ] Botón "Jugar" del inicio según §7.2.
- [ ] Ilustración simple por mundo (puede ser un color y un ícono al principio).

Criterios de aceptación:

- Con un perfil de prueba (`?debug=1` permite cargar un estado avanzado), se ve el mapa en cada estado posible.
- Ganar el jefe del mundo 1 abre 2, 3 y 4 a la vez; el 5 recién se abre con los tres jefes vencidos.
- Perder contra el jefe no hace perder nada.

---

## Etapa 5 — Premios

**Objetivo:** el sistema de premios de la especificación §8.

Tareas:

- [ ] XP y nivel visibles en el inicio; XP ganado animado en resultados.
- [ ] Racha con la siesta de gato semanal.
- [ ] Croquetas y tienda de la colección (`collection.json`), con vista previa de la gatita con el accesorio.
- [ ] Gatos amigos ganados por mundo.
- [ ] Insignias (`badges.json`) con pantalla de colección; las secretas se muestran como "?" hasta ganarlas.
- [ ] Notificación dentro de la app al ganar algo (no push).
- [ ] Reemplazar la pantalla vieja de logros y el gráfico de Recharts por una vista de progreso por regla (barras simples de EMA, sin librería pesada).

Criterios de aceptación:

- Ningún premio se puede ganar solo jugando mucho sin acertar (test de simulación con 50 % de aciertos durante 100 rondas: 0 croquetas de jefe, 0 estrellas).
- Faltar un día con siesta disponible no corta la racha; faltar dos sí.

---

## Etapa 6 — PWA y mobile

**Objetivo:** que se instale y funcione sin red.

Tareas:

- [ ] `vite-plugin-pwa`: manifest (nombre, `short_name`, colores, `display: standalone`, orientación vertical), íconos 192/512 y maskable.
- [ ] Precache del shell, fuentes y `words/*.json`.
- [ ] Botón "Instalar" propio que aparece después de la segunda ronda (`beforeinstallprompt`); pantalla de ayuda para iOS ("Compartir → Agregar a inicio").
- [ ] Aviso "Hay una versión nueva" cuando se actualiza el service worker.
- [ ] Revisión mobile completa: zona del pulgar, tamaños táctiles, `100dvh`, áreas seguras (`env(safe-area-inset-*)`).

Criterios de aceptación:

- Lighthouse: instalable, sin errores de PWA.
- Con la app instalada y el modo avión activado, se juega una ronda completa y se guarda.
- Funciona en Chrome Android y Safari iOS.

**→ Hito: prueba con chicos.** Juntar datos de uso (cuánto tardan, dónde abandonan, qué reglas fallan) y ajustar `config.ts`.

---

## Etapa 7 — Backend y sincronización

**Objetivo:** el progreso se guarda en la nube y se recupera en otro dispositivo. Todavía sin aulas.

Tareas:

- [ ] Supabase: proyecto de desarrollo; migraciones del esquema `private` ([arquitectura §5](arquitectura.md#5-modelo-de-datos-remoto-postgres)); `supabase start` para local.
- [ ] Test de seguridad: con la clave pública, un `select` sobre cualquier tabla de `private` falla.
- [ ] Worker con Hono: `auth.ts` (JWKS de Supabase), `db.ts` (postgres.js + Hyperdrive), rutas `accounts/me`, `profiles`, `rounds`, `profiles/:id/state`.
- [ ] `POST /api/rounds` con todas las validaciones de arquitectura §6, idempotente, recalculando con `shared/engine`.
- [ ] Cron diario de keepalive.
- [ ] Rate limiting.
- [ ] Cliente: cola de sincronización (arquitectura §7), reintentos con backoff, indicador discreto de "sincronizado".
- [ ] Proxy de `/api` en Vite para desarrollo; `wrangler.toml` con entornos preview y producción.
- [ ] Deploy: Pages + Worker en el mismo dominio.

Criterios de aceptación:

- Jugar offline 3 rondas, volver a tener red: se suben solas y el estado del servidor coincide con el local.
- Mandar la misma ronda dos veces no la duplica.
- Una ronda con un `wordId` inexistente o un jefe no habilitado se rechaza o no da desbloqueo.
- Tests de integración del Worker con una base local.

---

## Etapa 8 — Cuentas y aula

**Objetivo:** familias y docentes; el tablero del docente.

Tareas:

- [ ] Login adulto con Supabase Auth (Google y magic link). Elección de rol: familia o docente.
- [ ] Familia: crear perfiles de chicos y vincular un perfil invitado existente (sube su historial).
- [ ] Docente: crear aula, ver y copiar el código de 6 letras.
- [ ] Chico: "Entrar a mi aula" con código + alias + PIN de 4 dígitos; recibe token de perfil. Recuperar el perfil en otro dispositivo con el mismo alias + PIN.
- [ ] Tablero docente: tabla de chicos × reglas con EMA (color + texto), mundo actual, última actividad; vista por chico.
- [ ] Abrir un mundo para todo el aula.
- [ ] Desafío semanal del aula (el curso suma como equipo) — opcional para el MVP.

Criterios de aceptación:

- Un docente crea un aula, tres chicos entran desde tres celulares y sus rondas aparecen en el tablero.
- Probar 11 PIN seguidos desde la misma IP queda bloqueado.
- Ningún dato del chico incluye email ni nombre real.

---

## Etapa 9 — Cierre del MVP

**Objetivo:** listo para un piloto con cursos reales.

Tareas:

- [ ] Banco ampliado y revisado por docentes (prioridad: tiers 3 de mundos 8, 9 y 10). Herramienta simple de revisión: una página interna que muestra cada palabra con su clasificación y permite marcar "revisar".
- [ ] Accesibilidad: contraste AA, foco visible, lectores de pantalla en el turno, opción de texto grande.
- [ ] Ilustraciones definitivas de la gatita y los mundos.
- [ ] Textos finales de la gatita y las lecciones, revisados por docentes.
- [ ] Política de privacidad y términos, pensados para menores (Ley 25.326).
- [ ] Publicidad detrás de bandera (arquitectura §11), apagada por defecto.
- [ ] Monitoreo de errores en el cliente y el Worker.
- [ ] Pasar Supabase a Pro antes del piloto si hay escuelas reales.

Criterios de aceptación:

- Un curso completo juega dos semanas sin incidentes bloqueantes.
- Los docentes del piloto pueden responder con el tablero "¿qué regla tengo que repasar con este curso?".
