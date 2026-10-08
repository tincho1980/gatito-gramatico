// Arnés de integración: Postgres embebido (PGlite) con la migración real, servido por socket
// para que el Worker use el mismo cliente (postgres.js) que en producción, y tokens firmados
// con una clave del test en lugar de la de Supabase.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import postgres, { type Sql } from 'postgres';
import { createApp, type Deps } from '../src/app.ts';
import { supabaseVerifier } from '../src/auth.ts';
import type { Env, RateLimiter } from '../src/env.ts';
import { BANK } from '../src/words.ts';
import { applyMigrations } from '../scripts/migrations.ts';

export const SUPABASE_URL = 'https://test.supabase.co';

export interface Harness {
  db: PGlite;
  sql: Sql;
  app: ReturnType<typeof createApp>;
  /** Token de adulto válido para `sub`. */
  token: (sub: string, opts?: { issuer?: string; expiresIn?: string }) => Promise<string>;
  /** Llama a la API como ese adulto. */
  call: (sub: string | null, method: string, path: string, body?: unknown) => Promise<Response>;
  setNow: (iso: string) => void;
  setLimiter: (l: RateLimiter | undefined) => void;
  close: () => Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const db = await PGlite.create();
  // Los roles que Supabase ya trae.
  await db.exec('create role anon nologin; create role authenticated nologin;');
  const server = new PGLiteSocketServer({ db, port: 0, host: '127.0.0.1' });
  await server.start();
  const address = (
    server as unknown as { server: { address(): { port: number } } }
  ).server.address();
  const sql = postgres({
    host: '127.0.0.1',
    port: address.port,
    user: 'postgres',
    database: 'postgres',
    max: 1,
    onnotice: () => {},
  });
  // Las migraciones reales, con el mismo runner que `npm run db:push`.
  await applyMigrations(sql);

  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: 'ES256' }] });
  const token: Harness['token'] = (
    sub,
    { issuer = `${SUPABASE_URL}/auth/v1`, expiresIn = '1h' } = {},
  ) =>
    new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject(sub)
      .setIssuer(issuer)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(privateKey);

  let now = new Date('2026-04-01T12:00:00.000Z');
  let limiter: RateLimiter | undefined;
  const deps: Deps = {
    bank: BANK,
    now: () => now,
    openDb: () => ({ sql, close: async () => {} }),
    verifier: () => supabaseVerifier(SUPABASE_URL, jwks),
    limiter: () => limiter,
  };
  const app = createApp(deps);
  const env = { SUPABASE_URL } as Env;

  return {
    db,
    sql,
    app,
    token,
    async call(sub, method, path, body) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sub) headers.Authorization = `Bearer ${await token(sub)}`;
      return app.request(
        `/api${path}`,
        { method, headers, body: body === undefined ? undefined : JSON.stringify(body) },
        env,
      );
    },
    setNow: (iso) => {
      now = new Date(iso);
    },
    setLimiter: (l) => {
      limiter = l;
    },
    async close() {
      await sql.end();
      await server.stop();
      await db.close();
    },
  };
}
