// Login de adultos (familia o docente) con Supabase Auth: Google o enlace por email. Los
// chicos nunca pasan por acá: los de aula entran con código, apodo y PIN.
//
// supabase-js se carga recién cuando hace falta (área de adultos o un perfil de familia que
// sincroniza), para no sumarle peso a la app de los chicos.
//
// Modo local (`vite --mode localauth`, solo para probar con `npm run dev:local` y los e2e): no hay
// Supabase; el email ingresado da un token `local-<uuid>` que acepta la API local. Vite
// elimina ese código de cualquier build en otro modo (el que se publica es `production`).
import { create } from 'zustand';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdultSession {
  email: string;
  token: string;
}

interface AuthStore {
  status: 'loading' | 'out' | 'in';
  session: AdultSession | null;
}

export const useAdultAuth = create<AuthStore>(() => ({ status: 'loading', session: null }));

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const LOCAL = import.meta.env.MODE === 'localauth';

/** Hay login de adultos en este build. */
export const authConfigured = LOCAL || Boolean(URL && KEY);

let client: Promise<SupabaseClient> | null = null;
function supabase(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then(({ createClient }) => {
    const c = createClient(URL!, KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    c.auth.onAuthStateChange((_event, s) => {
      useAdultAuth.setState(
        s
          ? { status: 'in', session: { email: s.user.email ?? '', token: s.access_token } }
          : { status: 'out', session: null },
      );
    });
    return c;
  });
  return client;
}

// —— Modo local ——
const LOCAL_KEY = 'gatita.localAdult';
async function localToken(email: string): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.toLowerCase())),
  );
  const h = [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `local-${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function readLocal(): AdultSession | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as AdultSession) : null;
  } catch {
    return null;
  }
}

/** Arranca la sesión guardada (si hay). Se llama una vez al entrar al área de adultos. */
export async function initAdultAuth(): Promise<void> {
  if (LOCAL) {
    const s = readLocal();
    useAdultAuth.setState(s ? { status: 'in', session: s } : { status: 'out', session: null });
    return;
  }
  if (!authConfigured) {
    useAdultAuth.setState({ status: 'out', session: null });
    return;
  }
  const { data } = await (await supabase()).auth.getSession();
  const s = data.session;
  useAdultAuth.setState(
    s
      ? { status: 'in', session: { email: s.user.email ?? '', token: s.access_token } }
      : { status: 'out', session: null },
  );
}

/** Token vigente del adulto (renovado si hace falta), o `null` sin sesión. */
export async function getAdultToken(): Promise<string | null> {
  if (LOCAL) return readLocal()?.token ?? null;
  if (!authConfigured) return null;
  const { data } = await (await supabase()).auth.getSession();
  return data.session?.access_token ?? null;
}

const redirectTo = () => `${window.location.origin}/adultos`;

export async function signInWithGoogle(): Promise<void> {
  const { error } = await (
    await supabase()
  ).auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo() },
  });
  if (error) throw error;
}

/** Manda el enlace de ingreso por email. En modo local entra directamente. */
export async function signInWithEmail(email: string): Promise<'sent' | 'in'> {
  if (LOCAL) {
    const session = { email, token: await localToken(email) };
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(session));
    } catch {
      // sin storage la sesión dura hasta recargar
    }
    useAdultAuth.setState({ status: 'in', session });
    return 'in';
  }
  const { error } = await (
    await supabase()
  ).auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo() },
  });
  if (error) throw error;
  return 'sent';
}

export async function signOut(): Promise<void> {
  if (LOCAL) {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      // nada que borrar
    }
  } else if (authConfigured) {
    await (await supabase()).auth.signOut();
  }
  useAdultAuth.setState({ status: 'out', session: null });
}

export const isLocalAuth = LOCAL;
