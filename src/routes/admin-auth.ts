import { Hono } from 'hono'
import type { Env } from '../types'
import type { AppVariables } from '../middleware/auth'
import { adminCookie, clearAdminCookie, signAdminToken } from '../lib/auth'

export const adminAuth = new Hono<{ Bindings: Env; Variables: AppVariables }>()

adminAuth.post('/login', async (c) => {
  let username = ''
  let password = ''
  try {
    const body = await c.req.json<{ username?: string; password?: string }>()
    username = String(body.username || '')
    password = String(body.password || '')
  } catch {
    // empty credentials → 401 below
  }

  if (
    !c.env.ADMIN_USERNAME ||
    !c.env.ADMIN_PASSWORD ||
    username !== c.env.ADMIN_USERNAME ||
    password !== c.env.ADMIN_PASSWORD
  ) {
    return c.json({ error: '用户名或密码错误' }, 401)
  }

  const token = await signAdminToken(c.env, username)
  c.header('Set-Cookie', adminCookie(token))
  return c.json({ token, username })
})

adminAuth.post('/logout', async (c) => {
  c.header('Set-Cookie', clearAdminCookie())
  return c.json({ ok: true })
})
