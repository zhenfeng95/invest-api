import { Hono } from 'hono'
import type { Env, HomeMarketBriefItem, ReportMarket, ReportRow } from '../types'
import type { AppVariables } from '../middleware/auth'
import { toBrief, toDetail, toListItem } from '../lib/map'

const publicCache = 'public, s-maxage=600, stale-while-revalidate=3600'
const detailCache = 'public, s-maxage=1800, stale-while-revalidate=86400'

export const publicReports = new Hono<{ Bindings: Env; Variables: AppVariables }>()

publicReports.get('/home', async (c) => {
  const sql = c.get('sql')
  const markets: ReportMarket[] = ['US', 'A']
  const items: HomeMarketBriefItem[] = []

  for (const market of markets) {
    const rows = await sql<ReportRow[]>`
      SELECT *
      FROM reports
      WHERE status = 'published' AND market = ${market}
      ORDER BY report_date DESC
      LIMIT 1
    `
    const row = rows[0]
    items.push({
      market,
      brief: row ? toBrief(row) : null,
    })
  }

  c.header('Cache-Control', publicCache)
  return c.json({
    configured: true,
    source: 'db',
    items,
  })
})

publicReports.get('/', async (c) => {
  const sql = c.get('sql')
  const market = c.req.query('market') as ReportMarket | undefined

  const rows = market === 'A' || market === 'US'
    ? await sql<ReportRow[]>`
        SELECT *
        FROM reports
        WHERE status = 'published' AND market = ${market}
        ORDER BY report_date DESC
      `
    : await sql<ReportRow[]>`
        SELECT *
        FROM reports
        WHERE status = 'published'
        ORDER BY report_date DESC
      `

  c.header('Cache-Control', rows.length ? publicCache : 'no-store')
  return c.json({
    configured: true,
    source: 'db',
    items: rows.map(toListItem),
  })
})

publicReports.get('/:slug', async (c) => {
  const sql = c.get('sql')
  const slug = c.req.param('slug')

  const rows = await sql<ReportRow[]>`
    SELECT *
    FROM reports
    WHERE slug = ${slug} AND status = 'published'
    LIMIT 1
  `
  const row = rows[0]
  if (!row) {
    return c.json({ error: '日报不存在' }, 404)
  }

  c.header('Cache-Control', detailCache)
  return c.json(toDetail(row, c.env.PUBLIC_SITE_URL || 'https://zheninvest.com'))
})
