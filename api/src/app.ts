// Rutas de la API (arquitectura §6). Las dependencias (base, verificación del token, banco,
// reloj, rate limit) entran por `createApp` para poder probarlas con una base local.
import { Hono, type Context as HonoContext } from 'hono';
import type { Sql } from 'postgres';
import {
  AccountRequestSchema,
  aliasProblem,
  normalizeAlias,
  ProfileRequestSchema,
  PurchasesRequestSchema,
  replay,
  RoundsRequestSchema,
} from '@gatita/shared';
import type { VerifyToken } from './auth.ts';
import {
  ensureAccount,
  getAccount,
  getProfile,
  insertProfile,
  profilesOf,
  purchasesOf,
  roundsOf,
  teacherUnlocksOf,
  type ProfileRow,
} from './db.ts';
import type { Env, RateLimiter } from './env.ts';
import { receivePurchases, receiveRounds } from './sync.ts';
import type { Bank } from './words.ts';

export interface Deps {
  /** Abre la conexión de este request; `close` se llama al terminar. */
  openDb: (env: Env) => { sql: Sql; close: () => Promise<void> };
  verifier: (env: Env) => VerifyToken;
  bank: Bank;
  now?: () => Date;
  limiter?: (env: Env) => RateLimiter | undefined;
}

interface Vars {
  sql: Sql;
  accountId: string;
}

type C = HonoContext<{ Bindings: Env; Variables: Vars }>;

const fail = (c: C, status: 400 | 401 | 403 | 404 | 409 | 429, error: string) =>
  c.json({ error }, status);

async function body(c: C): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

export function createApp(deps: Deps) {
  const now = deps.now ?? (() => new Date());
  const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath('/api');

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'error interno' }, 500);
  });
  app.notFound((c) => c.json({ error: 'no existe' }, 404));

  // Conexión por request y autenticación del adulto.
  app.use('*', async (c, next) => {
    const token = c.req.header('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    const caller = token ? await deps.verifier(c.env)(token) : null;
    if (!caller) return fail(c, 401, 'falta un token válido');
    const db = deps.openDb(c.env);
    c.set('sql', db.sql);
    c.set('accountId', caller.accountId);
    try {
      await next();
    } finally {
      const closing = db.close();
      try {
        c.executionCtx.waitUntil(closing);
      } catch {
        await closing; // fuera de Workers (tests) no hay executionCtx
      }
    }
  });

  /** Perfil del adulto que llama; `null` si no existe o es de otro (no se distingue). */
  async function ownProfile(c: C, id: string): Promise<ProfileRow | null> {
    const profile = await getProfile(c.get('sql'), id);
    return profile && profile.ownerId === c.get('accountId') ? profile : null;
  }

  async function limited(c: C, key: string): Promise<boolean> {
    const limiter = deps.limiter?.(c.env);
    if (!limiter) return false;
    return !(await limiter.limit({ key })).success;
  }

  app.get('/accounts/me', async (c) => {
    const account = await getAccount(c.get('sql'), c.get('accountId'));
    return account ? c.json({ id: c.get('accountId'), ...account }) : fail(c, 404, 'sin cuenta');
  });

  app.post('/accounts/me', async (c) => {
    const parsed = AccountRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'rol inválido');
    const role = await ensureAccount(c.get('sql'), c.get('accountId'), parsed.data.role);
    return c.json({ id: c.get('accountId'), role });
  });

  app.get('/profiles', async (c) => {
    const rows = await profilesOf(c.get('sql'), c.get('accountId'));
    return c.json({
      profiles: rows.map((p) => ({
        id: p.id,
        alias: p.alias,
        avatar: p.avatar,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  });

  // Crea un perfil o vincula uno invitado con su historial.
  app.post('/profiles', async (c) => {
    const sql = c.get('sql');
    const parsed = ProfileRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'perfil inválido');
    const req = parsed.data;
    const problem = aliasProblem(req.alias);
    if (problem) return fail(c, 400, problem);
    const account = await getAccount(sql, c.get('accountId'));
    if (account?.role !== 'family') return fail(c, 403, 'solo una cuenta de familia crea perfiles');

    let profile = await getProfile(sql, req.id);
    if (profile && profile.ownerId !== c.get('accountId')) return fail(c, 409, 'el id ya existe');
    if (!profile) {
      const created = Math.min(
        req.createdAt ? Date.parse(req.createdAt) : Infinity,
        now().getTime(),
      );
      await insertProfile(sql, {
        id: req.id,
        ownerId: c.get('accountId'),
        alias: normalizeAlias(req.alias),
        avatar: req.avatar,
        createdAt: new Date(created).toISOString(),
      });
      profile = (await getProfile(sql, req.id))!;
    }
    const result = await receiveRounds(sql, profile, req.rounds ?? [], {
      bank: deps.bank,
      now: now(),
    });
    return c.json({ profile: { id: profile.id, alias: profile.alias }, ...result });
  });

  app.post('/rounds', async (c) => {
    const parsed = RoundsRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'pedido inválido');
    const profile = await ownProfile(c, parsed.data.profileId);
    if (!profile) return fail(c, 404, 'perfil inexistente');
    if (await limited(c, profile.id)) return fail(c, 429, 'demasiadas subidas, probá en un rato');
    return c.json(
      await receiveRounds(c.get('sql'), profile, parsed.data.rounds, {
        bank: deps.bank,
        now: now(),
      }),
    );
  });

  app.post('/purchases', async (c) => {
    const parsed = PurchasesRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'pedido inválido');
    const profile = await ownProfile(c, parsed.data.profileId);
    if (!profile) return fail(c, 404, 'perfil inexistente');
    if (await limited(c, profile.id)) return fail(c, 429, 'demasiadas subidas, probá en un rato');
    return c.json(
      await receivePurchases(c.get('sql'), profile, parsed.data.purchases, {
        bank: deps.bank,
        now: now(),
      }),
    );
  });

  // Para un dispositivo nuevo: el estado y los registros fuente.
  app.get('/profiles/:id/state', async (c) => {
    const sql = c.get('sql');
    const profile = await ownProfile(c, c.req.param('id'));
    if (!profile) return fail(c, 404, 'perfil inexistente');
    const rounds = await roundsOf(sql, profile.id);
    const state = replay(rounds, deps.bank.index, {
      teacherUnlocks: await teacherUnlocksOf(sql, profile.id),
    });
    return c.json({ state, rounds, purchases: await purchasesOf(sql, profile.id) });
  });

  return app;
}
