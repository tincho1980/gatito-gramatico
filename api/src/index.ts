// Cloudflare Worker: `/api/*` va a Hono; el resto es la app estática (assets de wrangler,
// con `run_worker_first` solo para `/api/*`). El cron diario evita que el plan gratis de
// Supabase pause el proyecto (arquitectura §6).
import postgres from 'postgres';
import { createApp } from './app.ts';
import { supabaseVerifier, type VerifyToken } from './auth.ts';
import type { Env } from './env.ts';
import { BANK } from './words.ts';

const connect = (env: Env) =>
  // Hyperdrive ya mantiene el pool: una conexión por request y sin buscar tipos al conectar.
  postgres(env.HYPERDRIVE.connectionString, { max: 1, fetch_types: false });

// Las claves públicas se cachean entre requests del mismo isolate.
let verifier: { url: string; verify: VerifyToken } | null = null;

const app = createApp({
  bank: BANK,
  openDb: (env) => {
    const sql = connect(env);
    return { sql, close: () => sql.end() };
  },
  verifier: (env) => {
    if (verifier?.url !== env.SUPABASE_URL) {
      verifier = { url: env.SUPABASE_URL, verify: supabaseVerifier(env.SUPABASE_URL) };
    }
    return verifier.verify;
  },
  limiter: (env) => env.ROUNDS_LIMITER,
});

export default {
  fetch: (request, env, ctx) => {
    const { pathname } = new URL(request.url);
    if (pathname === '/api' || pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event, env) {
    const sql = connect(env);
    try {
      await sql`select 1`;
    } finally {
      await sql.end();
    }
  },
} satisfies ExportedHandler<Env>;
