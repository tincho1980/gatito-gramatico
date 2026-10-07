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
- **`tipo`:** elige entre Aguda, Grave, Esdrújula (y Sobreesdrújula si la ronda o la palabra son del mundo 4 en adelante, así un repaso del mundo 4 se puede responder en cualquier ronda). Correcto si coincide con `type`.
- **Monosílabos sueltos** (sin oración): solo el paso `tilde`. No hay tónica que elegir ni tipo.
- Si la entrada tiene `sentence`, manda la oración aunque sea del mundo 1: solo `tilde`.
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
  challenge: boolean   // vino por el cupo de desafío: suma el bonus de §3
  ms: number           // tiempo total del turno
}
```

- `full = true` solo si todos los pasos son correctos y no hubo pista. Si hubo pista, el paso `tonica` se da por resuelto y no se registra en `steps`; el turno nunca es `full`.
- Un paso sin respuesta cuenta como incorrecto.

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

La lección no da XP (sus turnos no afectan nada, ver 4.2).

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
- Dentro de cada cupo el sorteo es ponderado: `peso = (1 + errores previos en esa palabra) × penalización`. Cuando el cupo tiene prioridades (nuevas: caja 1–2 antes que caja 0; repasos: caja más baja, después `due_round`), se respetan en orden y el sorteo ponderado decide entre las que empatan. Las de caja 0 se ordenan por `freq`.
- "Errores previos" son los turnos no `full` sin pista en esa palabra.
- Regla floja: entre las reglas con intentos de los mundos con jefe vencido. Si no hay ninguno, el cupo queda vacío y se rellena.
- Desafío: entre las candidatas se prefieren las que todavía no llegaron a caja 3.
- El orden final de la ronda se mezcla, salvo que el desafío nunca va primero.
- El armado recibe un `rng` (generador con semilla) para que los tests sean deterministas.

### 4.2 Rondas especiales

- **Lección:** no es ronda. Una o dos pantallas con la regla y 3 ejemplos tomados del tier 1 del mundo, más 3 turnos de práctica guiada que no afectan cajas ni EMA.
- **Jefe:** 10 palabras del mundo, mezcla de tiers (3 de tier 1, 4 de tier 2, 3 de tier 3), sin repasos ni regla floja. Ver 7.3.

### 4.3 Ajuste dentro de la ronda — ajustable

- **3 turnos seguidos no `full`:** la siguiente palabra se reemplaza por una del tier inferior del mismo mundo y se muestra con pista: la sílaba tónica viene resaltada. Si no hay tier inferior (práctica de tier 1), se muestra la palabra planeada, con pista. El contador vuelve a 0.
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

Cada vez que una palabra se juega se guarda `last_round` (número de ronda del perfil) y `last_seen_at` (fecha y hora de fin de la ronda). Además se cuentan los errores (turnos no `full` sin pista) y los `full` seguidos; un turno con pista no cambia ninguno de los dos.

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
- La EMA se guarda por regla **y por mundo de la palabra** (`mundo:regla`), porque 6.2 cuenta solo intentos de ese mundo.
- También se guardan los últimos 30 resultados (`full` o no) de cada regla, para 6.2.

### 6.2 Jefe habilitado

El jefe de un mundo se habilita cuando:

1. Se completaron las paradas anteriores del mundo (7.2), y
2. Cada regla del mundo tiene `ema >= 0,85` y, en sus **últimos 30 intentos, al menos 85 % `full`** (**ajustable**), contando solo intentos con palabras de ese mundo.

- **Qué reglas cuentan:** las que tienen al menos el 15 % de las palabras del mundo (**ajustable**). Una regla con una o dos palabras sueltas (por ejemplo, la única aguda terminada en vocal del mundo 7) no puede bloquear al jefe.
- **Por qué la ventana de 30 y no solo la EMA:** con α = 0,2 la EMA pasa de 0,5 a 0,85 con 6 aciertos seguidos, algo que un chico que acierta la mitad logra seguido. En la simulación, con solo EMA ≥ 0,85 y 20 intentos, un chico del 50 % venció al jefe del mundo 1. Con la ventana, el del 50 % no habilita ningún jefe en 100 rondas (30 de 30 semillas) y un chico perfecto vence los 10 jefes en unas 120 rondas.

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

- Las paradas son secuenciales (empezando por la lección). Una ronda de una parada cuyas anteriores no están completas no la completa. Una parada completada se puede volver a jugar.
- El mundo 1 tiene solo lección, práctica, práctica + y jefe: no tiene parada de desafío. Sus palabras de tier 3 aparecen como desafío y en el jefe.
- Si terminó las paradas pero el jefe todavía no está habilitado (6.2), sigue jugando la última parada de práctica.
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

- Un día cuenta si se terminó al menos una ronda (no lección), en la zona horaria del dispositivo. Cada ronda guarda su offset (`tzOffsetMin`) para que el cálculo dé lo mismo en el servidor.
- Una "siesta de gato" por semana (lunes a domingo): si falta un día, se consume la siesta de la semana de ese día y la racha sigue. Si ya se usó, la racha vuelve a empezar. Faltar dos días seguidos corta la racha.

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
| Remontada | Una regla jugada en la ronda tiene una EMA ≥ 0,20 más alta que hace 7 días (si no tenía valor hace 7 días, no cuenta) |
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
  bossGate: { minEma: 0.85, window: 30, minAccuracy: 0.85, minRuleShare: 0.15 },
  stopPass: { 2: 7, 3: 7, 4: 6 },           // full sobre 10 por parada
  worldsWithoutChallengeStop: [1],
  bossTiers: [3, 4, 3],
  bossWin: 8,
  bossTwoStars: 9,
  threeStarsBoxShare: 0.8,
  inRound: { errorsForHint: 3, fullsForChallenge: 5 },
  xp: { full: 10, partial: 4, streakBonus: 2, streakFrom: 3, challenge: 5, boss: 50 },
  croquetas: { box3: 1, box5: 2, boss: 10 },
  badges: { streaks: [3, 7, 30], comeback: { days: 7, minRise: 0.2 },
            notFooled: { minErrors: 3, fulls: 5 }, nightOwl: { fromHour: 0, toHour: 5 } },
  // y maxBox, threeStarsMinBox (ver config.ts)
}
```
