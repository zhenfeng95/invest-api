import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'
import type { Env } from './types'
import { createSql } from './lib/db'
import type { AppVariables } from './middleware/auth'
import { publicReports } from './routes/public-reports'
import { adminAuth } from './routes/admin-auth'
import { adminReports } from './routes/admin-reports'

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>()

app.use('*', async (c, next) => {
  const origins = (c.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  return cors({
    origin: (origin) => {
      if (!origin) {
        return origins[0] || '*'
      }
      return origins.includes(origin) ? origin : ''
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    credentials: true,
  })(c, next)
})

app.get('/health', (c) => c.json({ ok: true, service: 'invest-api' }))

const withDb = createMiddleware<{ Bindings: Env; Variables: AppVariables }>(async (c, next) => {
  let sql
  try {
    sql = createSql(c.env)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database error'
    return c.json({ error: message, configured: false }, 503)
  }

  c.set('sql', sql)
  try {
    await next()
  } finally {
    c.executionCtx.waitUntil(
      Promise.resolve(sql.end({ timeout: 2 })).then(
        () => undefined,
        () => undefined,
      ),
    )
  }
})

app.use('/v1/reports', withDb)
app.use('/v1/reports/*', withDb)
app.use('/v1/admin/reports', withDb)
app.use('/v1/admin/reports/*', withDb)

app.route('/v1/reports', publicReports)
app.route('/v1/admin/auth', adminAuth)
app.route('/v1/admin/reports', adminReports)

app.notFound((c) => c.json({ error: 'Not Found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'Internal Error' }, 500)
})

export default app
