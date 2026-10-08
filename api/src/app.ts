// Rutas de la API (arquitectura §6). Las dependencias (base, verificación del token, banco,
// reloj, rate limit, secreto) entran por `createApp` para poder probarlas con una base local.
//
// Dos tipos de llamador:
// - adulto (familia o docente): JWT de Supabase Auth;
// - chico de aula: token de perfil firmado por el Worker (`classrooms/join`), sin cuenta.
import { Hono, type Context as HonoContext } from 'hono';
import type { Sql } from 'postgres';
import {
  AccountRequestSchema,
  aliasProblem,
  applyTeacherUnlocks,
  ClassroomRequestSchema,
  CONFIG,
  isClassroomCode,
  JoinRequestSchema,
  normalizeAlias,
  normalizeClassroomCode,
  ProfileRequestSchema,
  PurchasesRequestSchema,
  RoundsRequestSchema,
  UnlockRequestSchema,
  type ClassroomSummary,
  type DashboardResponse,
  type JoinResponse,
} from '@gatita/shared';
import type { VerifyToken } from './auth.ts';
import {
  addUnlock,
  classroomByCode,
  classroomsOf,
  ensureAccount,
  getAccount,
  getClassroom,
  getProfile,
  insertClassroom,
  insertClassroomProfile,
  insertProfile,
  profileInClassroom,
  profilesOf,
  profilesOfClassrooms,
  purchasesOf,
  recordJoinAttempt,
  roundsOf,
  saveState,
  statesOfClassroom,
  studentsOf,
  unlocksOf,
  type ProfileRow,
} from './db.ts';
import type { Env, RateLimiter } from './env.ts';
import { hashIp, hashPin, sameHex, signProfileToken, verifyProfileToken } from './secrets.ts';
import { currentState, receivePurchases, receiveRounds } from './sync.ts';
import type { Bank } from './words.ts';

export interface Deps {
  /** Abre la conexión de este request; `close` se llama al terminar. */
  openDb: (env: Env) => { sql: Sql; close: () => Promise<void> };
  verifier: (env: Env) => VerifyToken;
  /** Secreto del Worker para tokens de perfil, PIN e IP (`wrangler secret put APP_SECRET`). */
  appSecret: (env: Env) => string;
  bank: Bank;
  now?: () => Date;
  /** Subidas por perfil (rondas y compras). */
  limiter?: (env: Env) => RateLimiter | undefined;
  /** Ingresos al aula por IP (además del conteo en la base). */
  joinLimiter?: (env: Env) => RateLimiter | undefined;
  /** Generador de códigos de aula (para tests). */
  randomCode?: () => string;
}

type Caller = { kind: 'adult'; accountId: string } | { kind: 'profile'; profileId: string };

interface Vars {
  sql: Sql;
  caller: Caller;
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

export function randomClassroomCode(): string {
  const { codeAlphabet, codeLength } = CONFIG.classroom;
  const bytes = crypto.getRandomValues(new Uint8Array(codeLength));
  // 24 letras: el sesgo de `% 24` sobre 256 valores no importa para un código de aula.
  return [...bytes].map((b) => codeAlphabet[b % codeAlphabet.length]).join('');
}

export function createApp(deps: Deps) {
  const now = deps.now ?? (() => new Date());
  const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath('/api');

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'error interno' }, 500);
  });
  app.notFound((c) => c.json({ error: 'no existe' }, 404));

  async function withDb<T>(c: C, run: () => Promise<T>): Promise<T> {
    const db = deps.openDb(c.env);
    c.set('sql', db.sql);
    try {
      return await run();
    } finally {
      const closing = db.close();
      try {
        c.executionCtx.waitUntil(closing);
      } catch {
        await closing; // fuera de Workers (tests) no hay executionCtx
      }
    }
  }

  // Ingreso de un chico al aula: público, con límite por IP (arquitectura §6 y §9.7).
  app.post('/classrooms/join', (c) =>
    withDb(c, async () => {
      const sql = c.get('sql');
      const secret = deps.appSecret(c.env);
      const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'local';
      const ipHash = await hashIp(secret, ip);
      const limiter = deps.joinLimiter?.(c.env);
      if (limiter && !(await limiter.limit({ key: ipHash })).success) {
        return fail(c, 429, 'Demasiados intentos. Esperá un minuto.');
      }
      const attempts = await recordJoinAttempt(sql, ipHash, CONFIG.classroom.joinWindowMin);
      if (attempts > CONFIG.classroom.joinAttempts) {
        return fail(c, 429, 'Demasiados intentos. Esperá un minuto.');
      }

      const parsed = JoinRequestSchema.safeParse(await body(c));
      if (!parsed.success) return fail(c, 400, 'Revisá el código, tu apodo y el PIN de 4 números.');
      const req = parsed.data;
      const code = normalizeClassroomCode(req.code);
      const alias = normalizeAlias(req.alias);
      const problem = aliasProblem(alias);
      if (problem) return fail(c, 400, problem);
      const classroom = isClassroomCode(code) ? await classroomByCode(sql, code) : null;
      if (!classroom) return fail(c, 404, 'No hay ningún aula con ese código.');

      const pinHash = await hashPin(secret, classroom.id, alias, req.pin);
      const found = await profileInClassroom(sql, classroom.id, alias);
      if (found) {
        if (!found.pinHash || !sameHex(found.pinHash, pinHash)) {
          return fail(c, 401, 'El apodo o el PIN no coinciden.');
        }
        return c.json({
          token: await signProfileToken(secret, found.id, now()),
          profile: {
            id: found.id,
            alias: found.alias,
            avatar: found.avatar,
            classroomId: classroom.id,
          },
          existing: true,
        } satisfies JoinResponse);
      }

      // Perfil nuevo: si viene de un perfil invitado del dispositivo, conserva su id y su alta.
      const reuse = req.profileId && !(await getProfile(sql, req.profileId));
      const id = reuse ? req.profileId! : crypto.randomUUID();
      const createdAt = new Date(
        Math.min(req.createdAt ? Date.parse(req.createdAt) : Infinity, now().getTime()),
      ).toISOString();
      const avatar = req.avatar ?? 'naranja';
      await insertClassroomProfile(sql, {
        id,
        classroomId: classroom.id,
        alias,
        avatar,
        pinHash,
        createdAt,
      });
      return c.json({
        token: await signProfileToken(secret, id, now()),
        profile: { id, alias, avatar, classroomId: classroom.id },
        existing: false,
      } satisfies JoinResponse);
    }),
  );

  // Todo lo demás necesita un token: de adulto (Supabase) o de perfil (Worker).
  app.use('*', async (c, next) => {
    const token = c.req.header('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return fail(c, 401, 'falta un token válido');
    const profileId = await verifyProfileToken(deps.appSecret(c.env), token, now());
    const adult = profileId ? null : await deps.verifier(c.env)(token);
    if (!profileId && !adult) return fail(c, 401, 'falta un token válido');
    c.set(
      'caller',
      profileId ? { kind: 'profile', profileId } : { kind: 'adult', accountId: adult!.accountId },
    );
    await withDb(c, () => next());
  });

  const accountId = (c: C) => {
    const caller = c.get('caller');
    return caller.kind === 'adult' ? caller.accountId : null;
  };

  /** Perfil que el llamador puede usar; `null` si no existe o no es suyo (no se distingue). */
  async function ownProfile(c: C, id: string): Promise<ProfileRow | null> {
    const caller = c.get('caller');
    const profile = await getProfile(c.get('sql'), id);
    if (!profile) return null;
    if (caller.kind === 'profile') return caller.profileId === id ? profile : null;
    return profile.ownerId === caller.accountId ? profile : null;
  }

  async function teacherClassroom(c: C, id: string) {
    const teacher = accountId(c);
    const classroom = teacher ? await getClassroom(c.get('sql'), id) : null;
    return classroom && classroom.teacherId === teacher ? classroom : null;
  }

  async function limited(c: C, key: string): Promise<boolean> {
    const limiter = deps.limiter?.(c.env);
    if (!limiter) return false;
    return !(await limiter.limit({ key })).success;
  }

  app.get('/accounts/me', async (c) => {
    const id = accountId(c);
    if (!id) return fail(c, 403, 'solo para adultos');
    const account = await getAccount(c.get('sql'), id);
    return account ? c.json({ id, ...account }) : fail(c, 404, 'sin cuenta');
  });

  app.post('/accounts/me', async (c) => {
    const id = accountId(c);
    if (!id) return fail(c, 403, 'solo para adultos');
    const parsed = AccountRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'rol inválido');
    const role = await ensureAccount(c.get('sql'), id, parsed.data.role);
    return c.json({ id, role });
  });

  // Familia: sus perfiles. Docente: los chicos de sus aulas.
  app.get('/profiles', async (c) => {
    const id = accountId(c);
    if (!id) return fail(c, 403, 'solo para adultos');
    const account = await getAccount(c.get('sql'), id);
    const rows =
      account?.role === 'teacher'
        ? await profilesOfClassrooms(c.get('sql'), id)
        : await profilesOf(c.get('sql'), id);
    return c.json({
      profiles: rows.map((p) => ({
        id: p.id,
        alias: p.alias,
        avatar: p.avatar,
        classroomId: p.classroomId,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  });

  // Crea un perfil o vincula uno invitado con su historial.
  app.post('/profiles', async (c) => {
    const sql = c.get('sql');
    const owner = accountId(c);
    if (!owner) return fail(c, 403, 'solo para adultos');
    const parsed = ProfileRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'perfil inválido');
    const req = parsed.data;
    const problem = aliasProblem(req.alias);
    if (problem) return fail(c, 400, problem);
    const account = await getAccount(sql, owner);
    if (account?.role !== 'family') return fail(c, 403, 'solo una cuenta de familia crea perfiles');

    let profile = await getProfile(sql, req.id);
    if (profile && profile.ownerId !== owner) return fail(c, 409, 'el id ya existe');
    if (!profile) {
      const created = Math.min(
        req.createdAt ? Date.parse(req.createdAt) : Infinity,
        now().getTime(),
      );
      await insertProfile(sql, {
        id: req.id,
        ownerId: owner,
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

  // Para un dispositivo nuevo: el estado y los registros fuente. Con `?only=state`, solo el
  // estado (para ver lo que cambió en el servidor, como un mundo abierto por el docente).
  app.get('/profiles/:id/state', async (c) => {
    const sql = c.get('sql');
    const profile = await ownProfile(c, c.req.param('id'));
    if (!profile) return fail(c, 404, 'perfil inexistente');
    const state = await currentState(sql, profile.id, deps.bank);
    if (c.req.query('only') === 'state') return c.json({ state });
    return c.json({
      state,
      rounds: await roundsOf(sql, profile.id),
      purchases: await purchasesOf(sql, profile.id),
      profile: { id: profile.id, alias: profile.alias, avatar: profile.avatar },
    });
  });

  // —— Docente ——

  async function requireTeacher(c: C): Promise<string | null> {
    const id = accountId(c);
    if (!id) return null;
    const account = await getAccount(c.get('sql'), id);
    return account?.role === 'teacher' ? id : null;
  }

  app.get('/classrooms', async (c) => {
    const teacher = await requireTeacher(c);
    if (!teacher) return fail(c, 403, 'solo para docentes');
    const rows = await classroomsOf(c.get('sql'), teacher);
    return c.json({
      classrooms: rows.map((r): ClassroomSummary => ({
        id: r.id,
        name: r.name,
        code: r.code,
        students: r.students,
        unlocks: r.unlocks,
      })),
    });
  });

  app.post('/classrooms', async (c) => {
    const teacher = await requireTeacher(c);
    if (!teacher) return fail(c, 403, 'solo para docentes');
    const parsed = ClassroomRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'Poné un nombre de hasta 60 letras.');
    for (let attempt = 0; attempt < 5; attempt++) {
      const created = await insertClassroom(c.get('sql'), {
        teacherId: teacher,
        name: parsed.data.name,
        code: (deps.randomCode ?? randomClassroomCode)(),
      });
      if (created) {
        return c.json({
          classroom: { ...created, students: 0, unlocks: [] } satisfies ClassroomSummary & {
            teacherId: string;
          },
        });
      }
    }
    throw new Error('No se pudo generar un código de aula libre');
  });

  app.get('/classrooms/:id/dashboard', async (c) => {
    const sql = c.get('sql');
    const classroom = await teacherClassroom(c, c.req.param('id'));
    if (!classroom) return fail(c, 404, 'aula inexistente');
    const [summary] = (await classroomsOf(sql, classroom.teacherId)).filter(
      (r) => r.id === classroom.id,
    );
    const students = await studentsOf(sql, classroom.id);
    return c.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        students: students.length,
        unlocks: summary?.unlocks ?? [],
      },
      students: students.map((s) => ({
        id: s.id,
        alias: s.alias,
        avatar: s.avatar,
        world: s.lastWorld ?? 1,
        lastActivity: s.lastActivity?.toISOString() ?? null,
        roundsPlayed: s.roundsPlayed ?? 0,
        rules: Object.fromEntries(
          Object.entries(s.rules ?? {}).map(([k, m]) => [k, { ema: m.ema, attempts: m.attempts }]),
        ),
        stars: Object.fromEntries(
          Object.entries(s.worlds ?? {}).map(([k, w]) => [Number(k), w.stars]),
        ),
      })),
    } satisfies DashboardResponse);
  });

  app.post('/classrooms/:id/unlocks', async (c) => {
    const sql = c.get('sql');
    const classroom = await teacherClassroom(c, c.req.param('id'));
    if (!classroom) return fail(c, 404, 'aula inexistente');
    const parsed = UnlockRequestSchema.safeParse(await body(c));
    if (!parsed.success) return fail(c, 400, 'mundo inexistente');
    await addUnlock(sql, classroom.id, parsed.data.world);
    const unlocks = await unlocksOf(sql, classroom.id);
    // Abrir un mundo solo marca `unlocked`: se aplica sobre el estado guardado de cada chico.
    for (const { profileId, state } of await statesOfClassroom(sql, classroom.id)) {
      await saveState(sql, profileId, applyTeacherUnlocks(state, unlocks));
    }
    return c.json({ unlocks });
  });

  return app;
}
