// Cliente de la API del Worker (`/api`, mismo dominio). Cada llamada lleva el token que
// corresponde: el del adulto (Supabase) o el del chico de aula.
import type {
  ClassroomSummary,
  DashboardResponse,
  JoinResponse,
  ProfileState,
  ProfileStateResponse,
  PurchasesResponse,
  RoundsResponse,
} from '@gatita/shared';

export type GetToken = () => Promise<string | null>;
type Fetch = typeof fetch;

/** Error de la API: `retry` dice si vale la pena reintentar (red caída, 429, 5xx). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly retry: boolean,
    /** Mensaje del Worker, para mostrar (viene en voseo). */
    readonly reason?: string,
  ) {
    super(reason ?? `API ${status}`);
  }
}

const defaultFetch: Fetch = (...args) => fetch(...args);

export async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  {
    token,
    body,
    fetchImpl = defaultFetch,
  }: { token?: string | null; body?: unknown; fetchImpl?: Fetch },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetchImpl(`/api${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, true); // sin red
  }
  if (!res.ok) {
    const reason = await res
      .json()
      .then((b: { error?: string }) => b.error)
      .catch(() => undefined);
    throw new ApiError(res.status, res.status === 429 || res.status >= 500, reason);
  }
  return (await res.json()) as T;
}

/** Lo que usa la sincronización de un perfil (con su token). */
export interface Api {
  postRounds(profileId: string, rounds: unknown[]): Promise<RoundsResponse>;
  postPurchases(profileId: string, purchases: unknown[]): Promise<PurchasesResponse>;
  /** Solo el estado: para ver cambios del servidor (un mundo abierto por el docente). */
  getState(profileId: string): Promise<{ state: ProfileState }>;
}

export function createApi(getToken: GetToken, fetchImpl: Fetch = defaultFetch): Api {
  async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const token = await getToken();
    if (!token) throw new ApiError(401, false);
    return request<T>(method, path, { token, body, fetchImpl });
  }
  return {
    postRounds: (profileId, rounds) => call('POST', '/rounds', { profileId, rounds }),
    postPurchases: (profileId, purchases) => call('POST', '/purchases', { profileId, purchases }),
    getState: (profileId) => call('GET', `/profiles/${profileId}/state?only=state`),
  };
}

export type RemoteProfile = ProfileStateResponse & {
  profile: { id: string; alias: string; avatar: string };
};

/** Ingreso de un chico al aula: sin token. */
export const joinClassroom = (body: {
  code: string;
  alias: string;
  pin: string;
  avatar?: string;
  profileId?: string;
  createdAt?: string;
}) => request<JoinResponse>('POST', '/classrooms/join', { body });

/** Estado completo de un perfil (para traerlo a este dispositivo). */
export const fetchProfile = (token: string, profileId: string) =>
  request<RemoteProfile>('GET', `/profiles/${profileId}/state`, { token });

/** Llamadas del adulto (familia o docente), con el token de su sesión. */
export const adultApi = (token: string) => ({
  account: () =>
    request<{ id: string; role: 'family' | 'teacher' }>('GET', '/accounts/me', { token }),
  setRole: (role: 'family' | 'teacher') =>
    request<{ id: string; role: 'family' | 'teacher' }>('POST', '/accounts/me', {
      token,
      body: { role },
    }),
  profiles: () =>
    request<{
      profiles: { id: string; alias: string; avatar: string; classroomId: string | null }[];
    }>('GET', '/profiles', { token }),
  createProfile: (body: {
    id: string;
    alias: string;
    avatar: string;
    createdAt?: string;
    rounds?: unknown[];
  }) => request<RoundsResponse>('POST', '/profiles', { token, body }),
  classrooms: () => request<{ classrooms: ClassroomSummary[] }>('GET', '/classrooms', { token }),
  createClassroom: (name: string) =>
    request<{ classroom: ClassroomSummary }>('POST', '/classrooms', { token, body: { name } }),
  dashboard: (id: string) =>
    request<DashboardResponse>('GET', `/classrooms/${id}/dashboard`, { token }),
  unlock: (id: string, world: number) =>
    request<{ unlocks: number[] }>('POST', `/classrooms/${id}/unlocks`, {
      token,
      body: { world },
    }),
  fetchProfile: (profileId: string) => fetchProfile(token, profileId),
});
