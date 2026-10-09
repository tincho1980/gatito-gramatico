// Monitoreo de errores (plan, etapa 9): si la app falla, manda un aviso corto al Worker
// (`POST /api/errors`), que lo deja en los logs de Cloudflare. Sin datos del chico: solo el
// mensaje, las primeras líneas del stack, la ruta sin parámetros ni ids, y la versión.
import type { z } from 'zod/mini';
import type { ClientErrorSchema } from '@gatita/shared';

type Report = z.infer<typeof ClientErrorSchema>;

declare const __APP_VERSION__: string;

const MAX_PER_PAGE = 5;
const sent = new Set<string>();

/** Ruta sin parámetros ni ids (`/aula/3f2a…` → `/aula/:id`). */
export function cleanPath(pathname: string): string {
  return pathname
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .slice(0, 100);
}

/** Saca URLs con parámetros, emails y tokens de un texto, y lo recorta. */
export function scrub(text: string, max: number): string {
  return text
    .replace(/https?:\/\/[^\s)]+/g, (url) => url.split(/[?#]/)[0]!)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
    .slice(0, max);
}

export function buildReport(error: unknown, kind: Report['kind'], pathname: string): Report {
  const e = error instanceof Error ? error : new Error(String(error));
  return {
    message: scrub(e.message || 'Error sin mensaje', 300),
    stack: e.stack ? scrub(e.stack.split('\n').slice(0, 10).join('\n'), 2000) : undefined,
    path: cleanPath(pathname),
    version: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev',
    kind,
  };
}

export function reportError(error: unknown, kind: Report['kind'] = 'error'): void {
  const report = buildReport(error, kind, window.location.pathname);
  const key = `${report.kind}:${report.message}`;
  if (sent.has(key) || sent.size >= MAX_PER_PAGE) return;
  sent.add(key);
  try {
    void fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // sin red: no hay a quién avisar
  }
}

/** Escucha los errores que nadie atrapó. Solo en el build que se publica. */
export function listenForErrors(): void {
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'error'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'rejection'));
}
