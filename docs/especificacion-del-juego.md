# Especificación del juego

Fuente de verdad de la lógica. Todo lo que está acá se implementa como funciones puras en `shared/src/engine/` y se testea con Vitest. Los números marcados como **ajustable** viven en `shared/src/engine/config.ts` y se calibran después de probar con chicos.

## 1. Conceptos

| Término | Qué es |
| --- | --- |
| Palabra (`WordEntry`) | Una entrada del banco: palabra, sílabas, tónica, tipo, regla, mundo, tier, oración opcional. Ver [banco-de-palabras.md](banco-de-palabras.md). |
| Turno | Resolver una palabra. |
| Ronda | 10 turnos seguidos (puede ser 11, ver 4.3). |
| Mundo | Grupo de palabras de una regla. Hay 10. |
| Parada | Etapa dentro de un mundo: lección, práctica, práctica +, desafío, jefe. |
| Caja | Nivel de repaso de una palabra para un perfil (0 a 5). |
| Perfil | Un chico. Tiene su progreso propio. Puede ser invitado (solo local) o estar vinculado a una cuenta adulta o a un aula. |

## 2. El turno

### 2.1 Pasos según el tipo de palabra

| Caso | Pasos, en orden |
| --- | --- |
| Mundo 1 (sílaba tónica) | `tonica` |
| Palabra suelta, mundos 2 a 7 y 10 | `tonica` → `tipo` → `tilde` |
| Palabra con oración (mundos 8 y 9, y cualquier entrada con `sentence`) | `tilde` (la palabra aparece destacada dentro de la oración) |

- **`tonica`:** la palabra aparece sin tilde, separada en sílabas. El chico toca la sílaba que suena más fuerte. Correcto si toca `stressIndex`.
- **`tipo`:** elige entre Aguda, Grave, Esdrújula (y Sobreesdrújula desde el mundo 4). En monosílabos este paso se omite. Correcto si coincide con `type`.
- **`tilde`:** elige "Con tilde" o "Sin tilde". Correcto si coincide con `hasTilde`.
- Cada paso se responde una vez; no se puede volver atrás.
- Si el paso `tonica` falla, igual se muestra el siguiente con la sílaba correcta marcada. El turno ya cuenta como no completo, pero el chico sigue razonando sobre la palabra correcta.

### 2.2 Resultado del turno

```ts
type TurnResult = {
  wordId: string
  steps: { step: 'tonica' | 'tipo' | 'tilde'; correct: boolean }[]
  full: boolean        // todos los pasos correctos
  hinted: boolean      // se mostró pista antes de responder (4.3)
  ms: number           // tiempo total del turno
}
```

- `full = true` solo si todos los pasos son correctos y no hubo pista en `tonica`. Si hubo pista, el paso `tonica` se da por resuelto y no cuenta.

### 2.3 Feedback

Después del último paso, siempre:

1. La palabra escrita bien, con la sílaba tónica resaltada.
2. Una línea con la regla, generada a partir de `rule` (tabla de textos en `shared/src/engine/ruleTexts.ts`). Ejemplo para `grave_n_s_vocal`: "Es grave y termina en n, s o vocal: no lleva tilde."
3. Si hubo error y la entrada tiene `distractor`, se muestra: "Error común: exámen".
4. La gatita reacciona (`success` si `full`, `error` si no).

## 3. Puntos (XP) — ajustable

| Evento | XP |
| --- | --- |
| Turno `full` | 10 |
| Turno con al menos un paso correcto, no `full` | 4 |
| Turno sin pasos correctos | 0 |
| Racha dentro de la ronda: cada turno `full` desde el 3.º seguido | +2 |
| Palabra de desafío resuelta `full` | +5 |
| Jefe vencido | +50 |

## 4. La ronda

### 4.1 Composición (10 palabras) — ajustable

| Cupo | Origen | Criterio |
| --- | --- | --- |
| 5 | **Nuevas o en curso** del mundo y tier de la parada actual | Palabras en caja 0, 1 o 2 de ese tier; primero las de caja 1–2, después caja 0 por `freq` descendente |
| 3 | **Repasos vencidos** de cualquier mundo desbloqueado | Elegibles según 5.2; prioridad: caja más baja, después `due_round` más viejo |
| 1 | **Regla floja** de mundos anteriores | Una palabra de la regla con menor EMA (6.1) entre los mundos ya completados |
| 1 | **Desafío** | Palabra del tier siguiente del mismo mundo; si la parada es tier 3, del mundo siguiente desbloqueado; si no hay, tier 3 del mundo actual |

- Si un cupo no se llena, el faltante se completa con el cupo "Nuevas o en curso"; si tampoco alcanza, con cualquier palabra del mundo actual.
- Nunca la misma palabra dos veces en una ronda.
- Penalización por repetición: una palabra que apareció en cualquiera de las últimas 2 rondas tiene peso × 0,2 en el sorteo.
- Dentro de cada cupo el sorteo es ponderado: `peso = (1 + errores previos en esa palabra) × penalización`.
- El orden final de la ronda se mezcla, salvo que el desafío nunca va primero.
- El armado recibe un `rng` (generador con semilla) para que los tests sean deterministas.

### 4.2 Rondas especiales

- **Lección:** no es ronda. Una o dos pantallas con la regla y 3 ejemplos tomados del tier 1 del mundo, más 3 turnos de práctica guiada que no afectan cajas ni EMA.
- **Jefe:** 10 palabras del mundo, mezcla de tiers (3 de tier 1, 4 de tier 2, 3 de tier 3), sin repasos ni regla floja. Ver 7.3.

### 4.3 Ajuste dentro de la ronda — ajustable

- **3 turnos seguidos no `full`:** la siguiente palabra se reemplaza por una del tier inferior del mismo mundo (si existe) y se muestra con pista: la sílaba tónica viene resaltada. El contador vuelve a 0.
- **5 turnos `full` seguidos:** se agrega una palabra de desafío extra al final (la ronda pasa a 11). Máximo una vez por ronda.
- No aplica a la ronda del jefe.

### 4.4 Fin de ronda

Pantalla de resultados con: aciertos completos sobre total, XP ganado, qué regla mejoró y cuál conviene repasar (la de mayor y menor variación de EMA en la ronda), cajas que subieron, premios nuevos.

Una ronda se guarda como un registro con sus turnos; todo lo derivado (cajas, EMA, XP, premios) se recalcula desde los turnos.

## 5. Cajas de repaso (Leitner)

### 5.1 Transiciones

| Resultado del turno | Caja nueva |
| --- | --- |
| `full` | `min(caja + 1, 5)` (desde 0 pasa a 1 y después sube) |
| No `full` | 1 |
| Turno con pista | No cambia la caja |
| Turno de lección | No cambia nada |

Cada vez que una palabra se juega se guarda `last_round` (número de ronda del perfil) y `last_seen_at` (fecha y hora).

### 5.2 Cuándo vuelve una palabra — ajustable

`due_round = rounds_played_al_responder + intervalo[caja]`

| Caja | Intervalo (rondas) | Además |
| --- | --- | --- |
| 1 | 1 (la próxima ronda) | — |
| 2 | 2 | — |
| 3 | 4 | — |
| 4 | 8 | 24 h desde `last_seen_at` |
| 5 | 16 | 24 h desde `last_seen_at` |

Una palabra es elegible para el cupo de repasos si `rounds_played >= due_round` y, para cajas 4 y 5, `ahora - last_seen_at >= 24 h`.

`rounds_played` cuenta solo rondas terminadas (no lecciones). La ronda del jefe cuenta.

## 6. Dominio por regla y por mundo

### 6.1 EMA por regla

Por cada perfil y cada `rule`:

- `ema` empieza en 0,5 y `attempts` en 0.
- Cada turno (sin pista, no lección) actualiza: `ema = 0,8 × ema + 0,2 × (full ? 1 : 0)`, `attempts += 1`. **Ajustable:** el 0,2.

### 6.2 Jefe habilitado

El jefe de un mundo se habilita cuando:

1. Se completaron las paradas anteriores del mundo (7.2), y
2. Toda regla con palabras en ese mundo tiene `ema >= 0,85` y `attempts >= 20` (**ajustable**), contando solo intentos con palabras de ese mundo.

## 7. Mundos y mapa

### 7.1 Grafo de desbloqueo

| Mundo | Nombre | Tema | Se desbloquea al vencer al jefe de |
| --- | --- | --- | --- |
| 1 | La Sílaba que Ronronea | sílaba tónica | (abierto desde el inicio) |
| 2 | El Tejado Puntiagudo | agudas | 1 |
| 3 | Las Llanuras de la Siesta | graves | 1 |
| 4 | El Árbol Trepador | esdrújulas | 1 |
| 5 | El Mercado de los Ovillos | las tres mezcladas | 2 **y** 3 **y** 4 |
| 6 | El Río de los Abrazos | diptongos | 5 |
| 7 | El Puente Roto | hiatos | 6 |
| 8 | La Casa de los Gemelos | tú / tu, él / el | 5 |
| 9 | El Bosque de las Preguntas | qué, cómo | 8 |
| 10 | La Torre de la Gata Sabia | casos especiales | 7 **y** 9 |

- **Nombre** es el nombre de fantasía del mundo; **Tema** es el detalle corto que se muestra debajo en el mapa. Para el chico, no es una descripción completa del contenido (eso está en [banco-de-palabras.md](banco-de-palabras.md)).
- Se define como datos en `shared/src/data/worlds.ts` (`requires: number[]`), no como código condicional. La lógica de desbloqueo vive en `shared/src/engine/worlds.ts`.
- Lo desbloqueado nunca se vuelve a bloquear.
- Un docente puede abrir un mundo para su aula (`teacher_unlocks`); queda desbloqueado para esos perfiles aunque no hayan vencido al jefe anterior.

### 7.2 Paradas de un mundo

| # | Parada | Contenido | Se completa cuando |
| --- | --- | --- | --- |
| 1 | Lección | Regla + ejemplos + 3 turnos guiados | Al terminarla |
| 2 | Práctica | Rondas con tier 1 | Una ronda con ≥ 7 de 10 `full` |
| 3 | Práctica + | Rondas con tier 2 | Una ronda con ≥ 7 de 10 `full` |
| 4 | Desafío | Rondas con tier 3 | Una ronda con ≥ 6 de 10 `full` |
| 5 | Jefe | Ronda del jefe | Ver 7.3 |

- Las paradas son secuenciales. Una parada completada se puede volver a jugar.
- El mundo 1 tiene solo lección, práctica, práctica + y jefe (no tiene tier 3 obligatorio si el banco no lo trae).
- Botón "Jugar" en el inicio: arranca una ronda en la parada más avanzada no completada del último mundo jugado.

### 7.3 Jefe final — ajustable

- Se gana con **≥ 8 de 10** turnos `full`.
- Si pierde: mensaje de ánimo, vuelve a la parada 4 y puede reintentar cuando quiera (sigue habilitado).
- Al ganar: animación, +50 XP, estrellas (7.4), gato amigo del mundo a la colección y desbloqueo de los mundos que dependan de él.

### 7.4 Estrellas por mundo

| Estrellas | Condición |
| --- | --- |
| ★ | Jefe vencido |
| ★★ | Jefe vencido con ≥ 9 de 10 |
| ★★★ | Además, ≥ 80 % de las palabras del mundo en caja 3 o más |

Las estrellas solo suben, nunca bajan.

## 8. Premios

### 8.1 Racha diaria

- Un día cuenta si se terminó al menos una ronda (zona horaria del dispositivo).
- Una "siesta de gato" por semana (lunes a domingo): si falta un día, se consume la siesta y la racha sigue. Si ya se usó, la racha vuelve a 0.

### 8.2 Croquetas (moneda)

| Evento | Croquetas |
| --- | --- |
| Una palabra llega a caja 3 por primera vez | +1 |
| Una palabra llega a caja 5 por primera vez | +2 |
| Jefe vencido | +10 |

Las croquetas solo vienen de dominio, nunca de jugar mucho.

### 8.3 Colección

Catálogo en `shared/src/data/collection.json`: `{ id, kind: 'accesorio' | 'fondo' | 'gato', name, price, unlockedBy? }`. Los gatos amigos (uno por mundo) no se compran: se ganan con el jefe. Accesorios y fondos se compran con croquetas.

### 8.4 Insignias

Catálogo en `shared/src/data/badges.json`. Cada insignia tiene un `id` y una función de criterio en `shared/src/engine/badges.ts` que recibe el historial y devuelve si se ganó. Iniciales:

| Insignia | Criterio |
| --- | --- |
| Primera ronda | Terminar una ronda |
| Cazadora de agudas (y una por mundo) | Mundo con ★★★ |
| Remontada | Una regla sube ≥ 0,20 de EMA en los últimos 7 días |
| Ya no me engañan | Una palabra falló ≥ 3 veces y después tuvo 5 `full` seguidos |
| Racha de 3 / 7 / 30 | Racha de esos días |
| Gata trasnochadora (secreta) | Terminar una ronda entre las 0 y las 5 |

## 9. Textos y tono

- Voseo rioplatense en toda la interfaz del chico ("Tocá la sílaba que suena más fuerte").
- Los errores nunca dicen "mal" solos: siempre van con el porqué.
- Mensajes de la gatita en `app/src/content/gatita.ts`, varios por situación, elegidos al azar.

## 10. Valores ajustables (resumen)

Todos en `shared/src/engine/config.ts`:

```ts
export const CONFIG = {
  roundSize: 10,
  roundMix: { current: 5, review: 3, weakRule: 1, challenge: 1 },
  repeatPenalty: { lastRounds: 2, factor: 0.2 },
  leitnerIntervals: [0, 1, 2, 4, 8, 16],   // índice = caja
  minHoursForBoxes: { 4: 24, 5: 24 },
  emaAlpha: 0.2,
  emaInitial: 0.5,
  bossGate: { minEma: 0.85, minAttempts: 20 },
  stopPass: { 2: 7, 3: 7, 4: 6 },           // full sobre 10 por parada
  bossWin: 8,
  bossTwoStars: 9,
  threeStarsBoxShare: 0.8,
  inRound: { errorsForHint: 3, fullsForChallenge: 5 },
  xp: { full: 10, partial: 4, streakBonus: 2, streakFrom: 3, challenge: 5, boss: 50 },
} as const
```
