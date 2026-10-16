import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../types'

const COOKIE_NAME = 'invest_api_admin'

function secretKey(env: Env) {
  return new TextEncoder().encode(env.ADMIN_JWT_SECRET)
}

export async function signAdminToken(env: Env, username: string): Promise<string> {
  return new SignJWT({ role: 'admin', sub: username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey(env))
}

export async function verifyAdminToken(env: Env, token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env))
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export function readBearer(header: string | undefined): string | null {
  if (!header) {
    return null
  }
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export function adminCookie(token: string, maxAgeSec = 60 * 60 * 24 * 7): string {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`
}

export function clearAdminCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
}

export function readCookieToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null
  }
  const parts = cookieHeader.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === COOKIE_NAME) {
      return rest.join('=') || null
    }
  }
  return null
}
