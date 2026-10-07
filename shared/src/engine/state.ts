// Estado del perfil derivado de las rondas: `applyRound` y `replay`. Corre igual en la app y
// en el Worker; es determinista (las fechas vienen en la ronda).
import type { WordEntry } from '../schemas.ts';
import { WORLDS } from '../data/worlds.ts';
import { newBadges } from './badges.ts';
import { CONFIG, type Config } from './config.ts';
import { addDays, localDay } from './dates.ts';
import { applyTurnToWord, initialWordMastery } from './leitner.ts';
import { initialRuleMastery, isBossEnabled, ruleKey, updateEma } from './mastery.ts';
import { bossRewards, croquetasForWord, initialStreak, updateStreak } from './rewards.ts';
import { roundXp } from './scoring.ts';
import type { ProfileState, Round, WordIndex, WorldProgress } from './types.ts';
import { boxShare, canPlayStop, initialWorldProgress, starsFor, unlockedWorlds } from './worlds.ts';

export function initialState(): ProfileState {
  const worlds: Record<number, WorldProgress> = {};
  for (const w of WORLDS) worlds[w.id] = initialWorldProgress(w.requires.length === 0);
  return {
    roundsPlayed: 0,
    xp: 0,
    croquetas: 0,
    words: {},
    rules: {},
    ruleDaily: {},
    worlds,
    streak: initialStreak(),
    badges: {},
    owned: [],
    recentRounds: [],
    lastWorld: 1,
  };
}

/** Indexa el banco para el motor. */
export function indexWords(entries: Iterable<WordEntry>): WordIndex {
  const byId = new Map<string, WordEntry>();
  const byWorld = new Map<number, WordEntry[]>();
  for (const e of entries) {
    byId.set(e.id, e);
    const list = byWorld.get(e.world) ?? [];
    list.push(e);
    byWorld.set(e.world, list);
  }
  return { byId, byWorld };
}

export interface ApplyOptions {
  /** Mundos abiertos por el docente para el aula (§7.1). */
  teacherUnlocks?: readonly number[];
  config?: Config;
}

/** Aplica una ronda terminada. No modifica `state`. */
export function applyRound(
  state: ProfileState,
  round: Round,
  words: WordIndex,
  { teacherUnlocks = [], config = CONFIG }: ApplyOptions = {},
): ProfileState {
  const s = JSON.parse(JSON.stringify(state)) as ProfileState; // el estado es JSON plano
  const progress = (s.worlds[round.world] ??= initialWorldProgress(false));
  s.lastWorld = round.world;

  // §4.2 La lección completa la parada 1 y no cambia nada más.
  if (round.kind === 'lesson') {
    if (canPlayStop(progress, round.world, 1, config)) addStop(progress, 1);
    return s;
  }

  const worldWords = words.byWorld.get(round.world) ?? [];
  const bossEnabled =
    round.kind === 'boss' && isBossEnabled(state, round.world, worldWords, config);
  const day = localDay(round.finishedAt, round.tzOffsetMin);

  // §5 cajas, §6.1 EMA, §8.2 croquetas por palabra
  const touchedRules = new Set<string>();
  for (const turn of round.turns) {
    const word = words.byId.get(turn.wordId);
    if (!word) continue; // palabra que ya no está en el banco: se ignora
    const before = s.words[word.id];
    const after = applyTurnToWord(
      before ?? initialWordMastery(),
      turn,
      state.roundsPlayed,
      round.finishedAt,
      config,
    );
    s.words[word.id] = after;
    s.croquetas += croquetasForWord(before, after, config);
    if (!turn.hinted) {
      const key = ruleKey(word.world, word.rule);
      s.rules[key] = updateEma(s.rules[key] ?? initialRuleMastery(config), turn.full, config);
      touchedRules.add(key);
    }
  }
  s.roundsPlayed += 1;

  // §7.2 paradas y §7.3 jefe
  const fulls = round.turns.filter((t) => t.full).length;
  const pass = config.stopPass[round.stop];
  if (
    round.kind === 'practice' &&
    pass !== undefined &&
    fulls >= pass &&
    canPlayStop(progress, round.world, round.stop, config)
  ) {
    addStop(progress, round.stop);
  }
  const bossWon = bossEnabled && fulls >= config.bossWin;
  if (bossEnabled) progress.bossReady = true;
  if (bossWon) {
    progress.bossBest = Math.max(progress.bossBest ?? 0, fulls);
    addStop(progress, 5);
    s.croquetas += config.croquetas.boss;
    for (const item of bossRewards(round.world)) if (!s.owned.includes(item)) s.owned.push(item);
  }
  s.xp += roundXp(round.turns, { bossWon }, config);

  // §7.3 El jefe que se habilita queda habilitado.
  for (const [id, p] of Object.entries(s.worlds)) {
    const worldId = Number(id);
    if (p.unlocked && p.bossBest === null && !p.bossReady) {
      if (isBossEnabled(s, worldId, words.byWorld.get(worldId) ?? [], config)) p.bossReady = true;
    }
  }

  // §7.1 desbloqueos
  for (const id of unlockedWorlds(s.worlds, teacherUnlocks)) {
    (s.worlds[id] ??= initialWorldProgress(true)).unlocked = true;
  }
  // §7.4 estrellas: solo suben
  for (const [id, p] of Object.entries(s.worlds)) {
    const share = boxShare(words.byWorld.get(Number(id)) ?? [], s.words, config);
    p.stars = Math.max(p.stars, starsFor(p.bossBest, share, config));
  }

  recordRuleDaily(s, touchedRules, day, config);
  s.streak = updateStreak(s.streak, day);
  s.recentRounds = [...s.recentRounds, round.turns.map((t) => t.wordId)].slice(
    -config.repeatPenalty.lastRounds,
  );

  for (const id of newBadges({ state: s, before: state, round, day, config })) {
    s.badges[id] = round.finishedAt;
  }
  return s;
}

function addStop(progress: WorldProgress, stop: WorldProgress['stopsDone'][number]) {
  if (!progress.stopsDone.includes(stop)) {
    progress.stopsDone.push(stop);
    progress.stopsDone.sort((a, b) => a - b);
  }
}

/** Guarda la EMA del día por regla. Conserva la ventana de la insignia Remontada. */
function recordRuleDaily(s: ProfileState, keys: Set<string>, day: string, config: Config) {
  const limit = addDays(day, -config.badges.comeback.days);
  for (const key of keys) {
    const ema = s.rules[key]?.ema ?? config.emaInitial;
    const list = (s.ruleDaily[key] ?? []).filter((x) => x.day !== day);
    list.push({ day, ema });
    list.sort((a, b) => a.day.localeCompare(b.day));
    // de lo anterior a la ventana alcanza con el último valor
    const old = list.filter((x) => x.day <= limit);
    s.ruleDaily[key] = [...old.slice(-1), ...list.filter((x) => x.day > limit)];
  }
}

/** Ordena las rondas como se aplican: por `finishedAt` y, si empatan, por id. */
export const sortRounds = (rounds: readonly Round[]): Round[] =>
  [...rounds].sort(
    (a, b) => Date.parse(a.finishedAt) - Date.parse(b.finishedAt) || a.id.localeCompare(b.id),
  );

/** Reconstruye el estado completo desde las rondas. */
export function replay(
  rounds: readonly Round[],
  words: WordIndex,
  options: ApplyOptions = {},
): ProfileState {
  return sortRounds(rounds).reduce((s, r) => applyRound(s, r, words, options), initialState());
}
