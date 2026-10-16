import { createMiddleware } from 'hono/factory'
import type { Env } from '../types'
import { readBearer, readCookieToken, verifyAdminToken } from '../lib/auth'

export type AppVariables = {
  sql: import('../lib/db').Sql
}

export const requireAdmin = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(
  async (c, next) => {
    const token =
      readBearer(c.req.header('authorization')) ||
      readCookieToken(c.req.header('cookie'))

    if (!token || !(await verifyAdminToken(c.env, token))) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    await next()
  },
)
