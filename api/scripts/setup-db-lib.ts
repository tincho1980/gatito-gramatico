// Partes puras del script setup-db (sin red ni archivos), para poder probarlas.

/** Variable de `.env.local` con la conexión de administrador del proyecto de producción. */
export const ADMIN_URL_VAR = 'SUPABASE_ADMIN_DB_URL';

export interface AdminUrl {
  ref: string;
  url: URL;
}

/**
 * La conexión de administrador tiene que ser la del Session pooler de Supabase
 * (`postgres.<ref>@aws-…pooler.supabase.com:5432`): es IPv4, que es lo que necesita Hyperdrive.
 */
export function parseAdminUrl(raw: string): AdminUrl {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('La conexión de administrador no es una URL de Postgres válida.');
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error('Tiene que empezar con postgres://');
  const ref = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]{20})$/)?.[1];
  if (!ref || !url.hostname.endsWith('.pooler.supabase.com') || url.port !== '5432') {
    throw new Error(
      'Usá la cadena del "Session pooler" de Supabase (usuario postgres.<ref>, host ' +
        '...pooler.supabase.com, puerto 5432): Hyperdrive necesita IPv4.',
    );
  }
  if (!url.password) throw new Error('Falta la contraseña de la base en la conexión.');
  return { ref, url };
}

/** Misma conexión, con el rol del Worker y su contraseña nueva. */
export function workerConnectionString({ ref, url }: AdminUrl, password: string): string {
  const worker = new URL(url.href);
  worker.username = `gatita_worker.${ref}`;
  worker.password = password;
  return worker.href;
}

/** El id de 32 caracteres hexadecimales que imprime `wrangler hyperdrive create`. */
export function parseHyperdriveId(output: string): string | null {
  return (
    output.match(/"id":\s*"([0-9a-f]{32})"/)?.[1] ?? output.match(/\b([0-9a-f]{32})\b/)?.[1] ?? null
  );
}

export const PLACEHOLDER_ID = '00000000000000000000000000000000';

/** Id de Hyperdrive de producción en `wrangler.jsonc`, o `null` si todavía es el de ejemplo. */
export function currentHyperdriveId(config: string): string | null {
  const section = config.slice(productionStart(config));
  const id = section.match(/"id":\s*"([0-9a-f]{32})"/)?.[1] ?? null;
  return id === PLACEHOLDER_ID ? null : id;
}

/** Escribe el id de Hyperdrive y la URL de Supabase de producción, sin tocar comentarios. */
export function updateWranglerConfig(
  config: string,
  { hyperdriveId, supabaseUrl }: { hyperdriveId: string; supabaseUrl: string },
): string {
  const start = productionStart(config);
  const section = config
    .slice(start)
    .replace(/("id":\s*")[0-9a-f]{32}(")/, `$1${hyperdriveId}$2`)
    .replace(/("SUPABASE_URL":\s*")[^"]*(")/, `$1${supabaseUrl}$2`);
  return config.slice(0, start) + section;
}

function productionStart(config: string): number {
  const i = config.indexOf('"production": {');
  if (i < 0) throw new Error('No encontré el entorno "production" en wrangler.jsonc.');
  return i;
}
