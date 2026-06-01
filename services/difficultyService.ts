import { GameResult, UserStats } from '../types';

export const DIFFICULTY_CONFIG = {
  default: 3,
  min: 1,
  max: 10,
  raiseThreshold: 80,
  lowerThreshold: 50,
  smoothingWindow: 3,
};

export function normalizeUserStats(stats: UserStats): UserStats {
  const history = stats.history.map((h) => ({
    ...h,
    targetLevel: h.targetLevel ?? Math.round(h.averageLevel),
  }));

  let skillLevel = stats.skillLevel;
  if (
    typeof skillLevel !== 'number' ||
    skillLevel < DIFFICULTY_CONFIG.min ||
    skillLevel > DIFFICULTY_CONFIG.max
  ) {
    skillLevel = history.length
      ? Math.round(history[history.length - 1].averageLevel)
      : DIFFICULTY_CONFIG.default;
  }

  return {
    ...stats,
    skillLevel: Math.max(
      DIFFICULTY_CONFIG.min,
      Math.min(DIFFICULTY_CONFIG.max, skillLevel)
    ),
    history,
  };
}

export function getSkillLevel(stats: UserStats): number {
  return normalizeUserStats(stats).skillLevel;
}

export function computeNextSkillLevel(
  current: number,
  efficiency: number
): number {
  if (efficiency >= DIFFICULTY_CONFIG.raiseThreshold) {
    return Math.min(DIFFICULTY_CONFIG.max, current + 1);
  }
  if (efficiency < DIFFICULTY_CONFIG.lowerThreshold) {
    return Math.max(DIFFICULTY_CONFIG.min, current - 1);
  }
  return current;
}

export function computeSmoothedEfficiency(history: GameResult[]): number {
  const recent = history.slice(-DIFFICULTY_CONFIG.smoothingWindow);
  if (recent.length === 0) return 0;
  return recent.reduce((acc, h) => acc + h.efficiency, 0) / recent.length;
}

export function computeEffectiveEfficiency(
  history: GameResult[],
  currentEfficiency: number
): number {
  const withCurrent: Pick<GameResult, 'efficiency'>[] = [
    ...history,
    { efficiency: currentEfficiency },
  ];
  if (withCurrent.length >= DIFFICULTY_CONFIG.smoothingWindow) {
    return (
      withCurrent
        .slice(-DIFFICULTY_CONFIG.smoothingWindow)
        .reduce((acc, h) => acc + h.efficiency, 0) /
      DIFFICULTY_CONFIG.smoothingWindow
    );
  }
  return currentEfficiency;
}

export function getLevelChangeMessage(
  currentLevel: number,
  previousTargetLevel: number | undefined
): string | null {
  if (previousTargetLevel === undefined) return null;
  if (currentLevel > previousTargetLevel) return 'Subiste de nivel';
  if (currentLevel < previousTargetLevel) return 'Bajamos un poco la dificultad';
  return null;
}
