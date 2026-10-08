// Tokens de adulto: JWT de Supabase Auth verificado con las claves públicas (JWKS) del
// proyecto (arquitectura §9.2). Los tokens de perfil de aula llegan en la etapa 8.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface Caller {
  /** `auth.users.id` del adulto. */
  accountId: string;
}

export type VerifyToken = (token: string) => Promise<Caller | null>;

export function supabaseVerifier(supabaseUrl: string, keys?: JWTVerifyGetKey): VerifyToken {
  const issuer = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
  const jwks = keys ?? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience: 'authenticated' });
      return payload.sub ? { accountId: payload.sub } : null;
    } catch {
      return null; // firma, emisor, audiencia o vencimiento inválidos
    }
  };
}
