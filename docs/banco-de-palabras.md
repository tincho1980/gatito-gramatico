# Banco de palabras

794 entradas en 10 mundos, generadas desde listas curadas y validadas por código. Ninguna palabra llega al juego sin que el motor de acentuación confirme su clasificación.

**Estado:** la lista actual se da por buena para desarrollo. Antes del MVP se amplía y la revisan docentes (sobre todo tiers 3 de los mundos 8, 9 y 10). La revisión se hace en la app, en `/revision` (panel docente), y las marcas se juntan con `npm run reviews:export` (arquitectura §12).

## Qué hay

| Mundo | Contenido | Entradas | Tiers 1/2/3 |
| --- | --- | --- | --- |
| 1 · La Sílaba que Ronronea | sílaba tónica | 80 | 28/25/27 |
| 2 · El Tejado Puntiagudo | agudas | 82 | 28/28/26 |
| 3 · Las Llanuras de la Siesta | graves | 80 | 28/31/21 |
| 4 · El Árbol Trepador | esdrújulas y sobreesdrújulas | 79 | 27/31/21 |
| 5 · El Mercado de los Ovillos | mezcla + trampas | 80 | 26/25/29 |
| 6 · El Río de los Abrazos | diptongos y triptongos | 81 | 30/30/21 |
| 7 · El Puente Roto | hiatos | 80 | 28/36/16 |
| 8 · La Casa de los Gemelos | monosílabos y diacrítica | 79 | 34/31/14 |
| 9 · El Bosque de las Preguntas | qué, cómo, dónde | 73 | 24/25/24 |
| 10 · La Torre de la Gata Sabia | plurales, -mente, compuestos, enclíticos | 80 | 26/32/22 |

El nombre y el tema que ve el chico están en la especificación §7.1 (fuente en `shared/src/data/worlds.ts`); acá la columna Contenido describe qué palabras trae cada mundo.

Incluye voseo rioplatense (`tenés`, `vení`, `decime`, `contámelo`), con tag `voseo`.

## Archivos (en el monorepo)

**La fuente son los `.txt` de `words/src/`.** Ahí se agregan, sacan o corrigen palabras, y después se corre el build, que genera los JSON. El pipeline completo está en el repo (recuperado del `banco-de-palabras.zip` original): el build reproduce los JSON publicados sin diferencias, y los 51 tests pasan.

| Ruta | Qué es |
| --- | --- |
| `words/src/world-XX.txt` | **Fuente.** Una palabra por línea (formato abajo). |
| `words/data/lexicon.json` | Cache de diccionario es_AR y frecuencias (lo genera `check-lexicon.py`). El build lo usa sin necesitar Python. |
| `words/data/lexicon-allow.txt` | Palabras correctas que el diccionario Hunspell no trae (enclíticos, regionalismos). |
| `words/lib/acentuacion.ts` | Motor: sílabas, tónica, tipo, regla, distractor. Tests en `acentuacion.test.ts`. |
| `words/lib/bank.ts` | Parseo de los `.txt`, reglas de validación por mundo y hash de versión. Los nombres y temas de los mundos vienen de `shared/src/data/worlds.ts`. |
| `words/scripts/build.ts` | `src/*.txt` + lexicón → `bank/*.json` + `index.json`, y copia a `app/public/words/`. Falla si algo no valida. |
| `words/lib/validate.ts` + `words/scripts/validate.ts` | Valida `bank/` contra los esquemas Zod, re-deriva cada campo, chequea la versión y que `app/public/words/` sea igual (gate de CI). |
| `words/lib/paths.ts` | Rutas del banco y lectura del lexicón. |
| `words/scripts/check-lexicon.py` | Regenera `data/lexicon.json`. Necesario solo al sumar palabras nuevas. |
| `words/bank/` | **Salida** generada: `world-XX.json` + `index.json`. Versionada en git. No se edita a mano. |
| `app/public/words/` | Copia de `words/bank/` que sirve la app. La escribe el build. No se edita a mano. |

### Formato de los archivos

Cada `world-XX.json` es un objeto con los datos del mundo y sus palabras:

```json
{ "world": 8, "name": "La Casa de los Gemelos", "topic": "tú / tu, él / el", "words": [ /* WordEntry[] */ ] }
```

`index.json`:

```json
{ "version": "c4c24f3c7bcd", "worlds": [ { "world": 1, "name": "La Sílaba que Ronronea", "topic": "sílaba tónica", "file": "world-01.json", "count": 80, "byTier": [28, 25, 27] } ] }
```

`version` es un hash (SHA-256, 12 caracteres) del contenido de los `world-XX.json`: cambia solo si cambian las palabras. Cada ronda guarda con qué versión se jugó (ver arquitectura §8).

## Formato de la fuente `.txt`

```
@world 5
@tier 1
cuchara
tenés #voseo | ¿[Tenés] hambre?
fácilmente =fácil #mente !mente
```

- `#tag` agrega un tag; `=palabra` una palabra relacionada (singular, base del adverbio, imperativo).
- `!mente`, `!diacritica`, `!interrogativa` cambian la regla cuando la ortografía sola no alcanza.
- `| oración` con la palabra entre corchetes. Obligatoria si la palabra sin tilde es otra palabra común (papa/papá, esta/está).
- Los `#tags`, `=relacionada` y `!flags` pueden ir después de la palabra o al final de la oración.
- Las líneas que empiezan con `//` son comentarios; las vacías se ignoran.
- Dentro de cada tier, el orden de las líneas no importa: el JSON sale ordenado por tier y por `freq` descendente.

## Entrada generada

```json
{
  "id": "examen", "word": "examen",
  "syllables": ["e", "xa", "men"], "stressIndex": 1,
  "type": "grave", "hasTilde": false, "rule": "grave_n_s_vocal",
  "world": 3, "tier": 2, "distractor": "exámen",
  "sentence": null, "tags": [], "features": [], "related": null, "freq": 4.08
}
```

- `type`: `monosilaba | aguda | grave | esdrujula | sobreesdrujula`.
- `rule`: por qué lleva o no tilde. `aguda_n_s_vocal`, `aguda_otra`, `grave_n_s_vocal`, `grave_otra`, `esdrujula`, `sobreesdrujula`, `hiato`, `monosilabo`, `diacritica`, `interrogativa`, `mente`. Es la clave del dominio por regla.
- `features`: `diptongo`, `triptongo`, `hiato` (calculados).
- `distractor`: el error más probable. En palabras sueltas, sacar o poner la tilde en la tónica (`exámen`, `fué`, `guión`). En oraciones, la palabra gemela (`esta → está`).
- `freq`: frecuencia Zipf (OpenSubtitles). `null` si no aparece. Ordena dentro de cada tier.
- Las entradas con oración tienen `id` = palabra + hash de la oración (`qué-3f2a1c`), estable aunque se reordene el archivo.
- El esquema Zod de la entrada vive en `shared/src/schemas.ts` (`WordEntrySchema`) y lo usan el build del banco, la app y el Worker.

## Cómo se valida

1. **Motor de acentuación:** separa en sílabas, ubica la tónica y deduce la regla desde la ortografía. Si la palabra tiene una tilde que la regla no pide (`exámen`, `fué`), falla.
2. **Restricción por mundo:** el mundo 2 solo acepta agudas, el 7 exige hiato, etc. Si una palabra cae en el mundo equivocado, falla.
3. **Diccionario es_AR:** si la palabra no existe tal como está escrita, falla (salvo `lexicon-allow.txt`).
4. **Ambigüedad:** si la forma sin tilde (o con tilde en otra vocal) es una palabra común, exige oración. Criterio: la otra forma tiene Zipf ≥ 3 y no es más de 10 veces menos frecuente.
5. **Esquemas:** cada archivo cumple `WorldFileSchema` / `IndexSchema` de `shared/src/schemas.ts`.
6. **Test en CI:** `npm test -w words` y `npm run validate -w words` re-derivan todos los campos del JSON publicado; además CI corre el build y falla si `words/bank/` o `app/public/words/` cambian. Nadie puede editar a mano un `type` sin que CI lo detecte.

## Comandos

Todo `words/` está en TypeScript y Node 22 lo ejecuta directo (sin compilar). Los scripts importan los esquemas y los mundos de `shared/`.

```bash
npm run build -w words      # src/*.txt → bank/*.json (falla si algo no valida)
npm run validate -w words   # solo valida bank/ y la copia de la app
npm test -w words           # tests del motor + banco (node --test)
```


Al sumar palabras nuevas, regenerar antes el lexicón (necesita Python, `pip install spylls` y los archivos de diccionario y frecuencias; ver el encabezado del script):

```bash
python3 words/scripts/check-lexicon.py --dict ruta/es_AR --freq ruta/es_full.txt
npm run build -w words
```

## Decisiones tomadas

- **Ortografía RAE 2010:** `guion`, `rio` (de reír), `fie` sin tilde; `solo` y demostrativos sin tilde. `guion` está en el mundo 8 tier 3 con tag `rae2010`, porque muchos docentes aprendieron `guión`.
- **-mente:** el `type` y `stressIndex` son los del adjetivo base (`fácilmente` → grave, tónica en *fá*), porque la regla es "conserva la tilde del adjetivo".
- **Mundos 8 y 9:** los pares diacríticos e interrogativos van siempre en oración. Sin contexto no hay respuesta correcta.
- **Voseo vs. tuteo en enclíticos:** `miralo` (vos) y `míralo` (tú) son ambas correctas. Las oraciones llevan otra marca de voseo (`querés`, `vos`) para que la respuesta sea única.
