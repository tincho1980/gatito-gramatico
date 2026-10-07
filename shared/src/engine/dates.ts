// Fechas en la hora del dispositivo, sin depender del reloj ni de la zona del entorno:
// todo se calcula desde el instante ISO y el offset que trae la ronda.

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

const localDate = (iso: string, tzOffsetMin: number): Date =>
  new Date(Date.parse(iso) + tzOffsetMin * 60_000);

/** `YYYY-MM-DD` del día local. */
export const localDay = (iso: string, tzOffsetMin: number): string =>
  localDate(iso, tzOffsetMin).toISOString().slice(0, 10);

/** Hora local (0–23). */
export const localHour = (iso: string, tzOffsetMin: number): number =>
  localDate(iso, tzOffsetMin).getUTCHours();

const dayToMs = (day: string): number => Date.parse(`${day}T00:00:00Z`);

/** Días entre dos fechas `YYYY-MM-DD` (b - a). */
export const daysBetween = (a: string, b: string): number =>
  Math.round((dayToMs(b) - dayToMs(a)) / MS_PER_DAY);

export const addDays = (day: string, n: number): string =>
  new Date(dayToMs(day) + n * MS_PER_DAY).toISOString().slice(0, 10);

/** Lunes de la semana (lunes a domingo) del día dado. */
export function weekOf(day: string): string {
  const weekday = new Date(dayToMs(day)).getUTCDay(); // 0 = domingo
  return addDays(day, -((weekday + 6) % 7));
}

/** Horas entre dos instantes ISO (b - a). */
export const hoursBetween = (a: string, b: string): number =>
  (Date.parse(b) - Date.parse(a)) / MS_PER_HOUR;
