import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, hoursBetween, localDay, localHour, weekOf } from './dates.ts';
import { initialWordMastery } from './leitner.ts';
import {
  bossRewards,
  croquetasForWord,
  currentStreak,
  initialStreak,
  updateStreak,
} from './rewards.ts';

const playDays = (days: string[]) => days.reduce(updateStreak, initialStreak());

describe('fechas en la hora del dispositivo', () => {
  it('día y hora local desde el instante y el offset', () => {
    // 01:30 UTC del 3 de marzo = 22:30 del 2 de marzo en Buenos Aires (-180)
    expect(localDay('2026-03-03T01:30:00.000Z', -180)).toBe('2026-03-02');
    expect(localHour('2026-03-03T01:30:00.000Z', -180)).toBe(22);
  });

  it('semanas de lunes a domingo', () => {
    expect(weekOf('2026-03-02')).toBe('2026-03-02'); // lunes
    expect(weekOf('2026-03-08')).toBe('2026-03-02'); // domingo
    expect(weekOf('2026-03-09')).toBe('2026-03-09');
  });

  it('aritmética de días y horas', () => {
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(hoursBetween('2026-03-02T10:00:00Z', '2026-03-03T10:00:00Z')).toBe(24);
  });
});

describe('§8.1 racha diaria', () => {
  it('§8.1 días seguidos suman', () => {
    expect(playDays(['2026-03-02', '2026-03-03', '2026-03-04']).days).toBe(3);
  });

  it('§8.1 varias rondas el mismo día cuentan una vez', () => {
    expect(playDays(['2026-03-02', '2026-03-02', '2026-03-03']).days).toBe(2);
  });

  it('§8.1 faltar un día con siesta disponible no corta la racha', () => {
    const s = playDays(['2026-03-02', '2026-03-03', '2026-03-05']);
    expect(s.days).toBe(3);
    expect(s.napWeek).toBe('2026-03-02');
  });

  it('§8.1 una sola siesta por semana', () => {
    const s = playDays(['2026-03-02', '2026-03-04', '2026-03-06']);
    expect(s.days).toBe(1);
  });

  it('§8.1 la siesta se renueva la semana siguiente', () => {
    const s = playDays([
      '2026-03-02',
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-10',
    ]);
    expect(s.days).toBe(7);
  });

  it('§8.1 faltar dos días corta la racha', () => {
    expect(playDays(['2026-03-02', '2026-03-03', '2026-03-06']).days).toBe(1);
  });

  it('§8.1 racha a mostrar hoy', () => {
    const s = playDays(['2026-03-02', '2026-03-03']);
    expect(currentStreak(initialStreak(), '2026-03-03')).toBe(0);
    expect(currentStreak(s, '2026-03-04')).toBe(2);
    expect(currentStreak(s, '2026-03-05')).toBe(2); // todavía la salva la siesta
    expect(currentStreak(s, '2026-03-06')).toBe(0);
    const napped = playDays(['2026-03-02', '2026-03-04']);
    expect(currentStreak(napped, '2026-03-06')).toBe(0); // la siesta de esa semana ya se usó
  });
});

describe('§8.2 croquetas', () => {
  const at = '2026-03-02T10:00:00.000Z';
  it('§8.2 primera vez en caja 3: +1; primera vez en caja 5: +2', () => {
    const before = initialWordMastery();
    expect(croquetasForWord(before, { ...before, box: 3, firstBox3At: at })).toBe(1);
    expect(
      croquetasForWord(
        { ...before, firstBox3At: at },
        { ...before, box: 5, firstBox3At: at, firstBox5At: at },
      ),
    ).toBe(2);
    expect(
      croquetasForWord({ ...before, firstBox3At: at }, { ...before, box: 3, firstBox3At: at }),
    ).toBe(0);
    expect(croquetasForWord(undefined, initialWordMastery())).toBe(0);
  });

  it('§8.3 el jefe de cada mundo da su gato amigo; el 10, la corona', () => {
    expect(bossRewards(1)).toEqual([]);
    expect(bossRewards(2)).toEqual(['gato-tejado']);
    expect(bossRewards(10)).toEqual(['corona-gata-sabia']);
  });
});
