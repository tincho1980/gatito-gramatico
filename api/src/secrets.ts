// Todo lo que depende del secreto del Worker (`APP_SECRET`, `wrangler secret`): los tokens de
// los chicos de aula, el hash del PIN y el de la IP del rate limit. Cada uso tiene su propia
// clave derivada del secreto, así que un valor no sirve para otro.
import { jwtVerify, SignJWT } from 'jose';
import { CONFIG } from '@gatita/shared';

const ISSUER = 'gatita';
const AUDIENCE = 'gatita-profile';
const encoder = new TextEncoder();

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    'raw',
    key as Uint8Array<ArrayBuffer>,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, encoder.encode(data)));
}

const derive = (secret: string, label: string) => hmac(encoder.encode(secret), `gatita:${label}`);
const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Compara sin cortar en la primera diferencia (no filtra por tiempo cuánto coincide). */
export function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signProfileToken(
  secret: string,
  profileId: string,
  now: Date,
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(profileId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + CONFIG.classroom.profileTokenDays * 86_400)
    .sign(await derive(secret, 'profile-token'));
}

/** Id del perfil si el token es un token de perfil válido; `null` si no. */
export async function verifyProfileToken(
  secret: string,
  token: string,
  now: Date,
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, await derive(secret, 'profile-token'), {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
      currentDate: now,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Hash del PIN. Con 4 dígitos hay 10 000 combinaciones: un hash lento (scrypt) no protege si
 * se filtra la base, y en Workers gasta más CPU de la que hay. Protege el secreto: sin él no
 * se puede calcular ninguno. Va atado al aula y al alias, así el mismo PIN da hashes distintos.
 */
export async function hashPin(
  secret: string,
  classroomId: string,
  alias: string,
  pin: string,
): Promise<string> {
  return hex(
    await hmac(await derive(secret, 'pin'), `${classroomId}:${alias.toLowerCase()}:${pin}`),
  );
}

/** La IP no se guarda: solo su hash, para contar intentos de ingreso. */
export async function hashIp(secret: string, ip: string): Promise<string> {
  return hex(await hmac(await derive(secret, 'ip'), ip));
}
