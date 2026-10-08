// Cliente de la API del Worker (`/api`, mismo dominio). El token es el del adulto (Supabase);
// sin token no se sincroniza nada.
import type { PurchasesResponse, RoundsResponse } from '@gatita/shared';

export type GetToken = () => Promise<string | null>;

/** Error de la API: `retry` dice si vale la pena reintentar (red caída, 429, 5xx). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly retry: boolean,
  ) {
    super(`API ${status}`);
  }
}

export interface Api {
  postRounds(profileId: string, rounds: unknown[]): Promise<RoundsResponse>;
  postPurchases(profileId: string, purchases: unknown[]): Promise<PurchasesResponse>;
}

export function createApi(
  getToken: GetToken,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): Api {
  async function post<T>(path: string, body: unknown): Promise<T> {
    const token = await getToken();
    if (!token) throw new ApiError(401, false);
    let res: Response;
    try {
      res = await fetchImpl(`/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, true); // sin red
    }
    if (!res.ok) throw new ApiError(res.status, res.status === 429 || res.status >= 500);
    return (await res.json()) as T;
  }
  return {
    postRounds: (profileId, rounds) => post('/rounds', { profileId, rounds }),
    postPurchases: (profileId, purchases) => post('/purchases', { profileId, purchases }),
  };
}
