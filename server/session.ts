import crypto from 'crypto';

/**
 * Stateless, HMAC-signed tokens.
 *
 * The original implementation kept verification codes and admin tokens in
 * process memory. That works for a single long-running server but breaks on
 * serverless: `request-code` and `confirm-code` routinely land on different
 * instances, so the second request never finds the session. Signing the state
 * into the token itself removes the shared-memory requirement entirely.
 */

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

let cachedSecret: string | null = null;

export function getSecret(): string {
  if (cachedSecret) return cachedSecret;

  const configured = (process.env.APP_SECRET || process.env.ADMIN_SECRET || '').trim();
  if (configured.length >= 16) {
    cachedSecret = configured;
    return cachedSecret;
  }

  if (isProduction) {
    // A per-instance random secret silently invalidates every token issued by
    // another instance, which looks exactly like "login keeps logging me out".
    // Fail loudly instead of failing mysteriously.
    throw new Error(
      'APP_SECRET is not set (or is shorter than 16 characters). ' +
      'Set APP_SECRET in your Vercel project environment variables so signed ' +
      'sessions stay valid across serverless instances.'
    );
  }

  console.warn('[session] APP_SECRET not set - generating an ephemeral development secret.');
  cachedSecret = crypto.randomBytes(32).toString('hex');
  return cachedSecret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Signs a payload, embedding an absolute expiry `exp` (epoch ms). */
export function signToken(payload: Record<string, unknown>, ttlMs: number): string {
  const body = base64url(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }));
  const mac = base64url(crypto.createHmac('sha256', getSecret()).update(body).digest());
  return `${body}.${mac}`;
}

// The optional counterpart members keep discriminated-union narrowing reliable
// when the union is produced through a generic type parameter.
export type VerifyResult<T> =
  | { ok: true; payload: T; error?: undefined }
  | { ok: false; payload?: undefined; error: string };

/** Verifies signature and expiry. Never throws on malformed input. */
export function verifyToken<T extends Record<string, any>>(token: string | undefined | null): VerifyResult<T> {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, error: 'Missing or malformed token.' };
  }

  const [body, mac] = token.split('.', 2);
  const expectedMac = base64url(crypto.createHmac('sha256', getSecret()).update(body).digest());

  const provided = Buffer.from(mac);
  const expected = Buffer.from(expectedMac);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return { ok: false, error: 'Token signature is invalid.' };
  }

  let payload: T;
  try {
    payload = JSON.parse(fromBase64url(body).toString('utf-8'));
  } catch {
    return { ok: false, error: 'Token payload is unreadable.' };
  }

  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
    return { ok: false, error: 'Token has expired.' };
  }

  return { ok: true, payload };
}

/** Constant-time comparison of a submitted code against its stored digest. */
export function hashCode(code: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${code.trim()}`).digest('hex');
}
