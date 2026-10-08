// Bindings del Worker (wrangler.jsonc).

/** Binding de Rate Limiting de Workers. */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  /** Conexión a Postgres de Supabase a través de Hyperdrive. */
  HYPERDRIVE: { connectionString: string };
  /** URL del proyecto de Supabase (pública): de ahí salen el emisor y las claves del JWT. */
  SUPABASE_URL: string;
  /** 60 subidas por minuto por perfil (arquitectura §6). */
  ROUNDS_LIMITER?: RateLimiter;
  /** La app estática (app/dist). */
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}
