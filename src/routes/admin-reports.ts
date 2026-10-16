import { Hono } from 'hono'
import type { AdminReportInput, Env, PublishStatus, ReportMarket, ReportRow } from '../types'
import { requireAdmin, type AppVariables } from '../middleware/auth'
import { renderMarkdown } from '../lib/markdown'
import { buildReportSlug, isValidDate } from '../lib/slug'
import { toAdminReport } from '../lib/map'

export const adminReports = new Hono<{ Bindings: Env; Variables: AppVariables }>()

adminReports.use('*', requireAdmin)

function badRequest(message: string) {
  return { error: message }
}

adminReports.get('/', async (c) => {
  const sql = c.get('sql')
  const market = c.req.query('market') as ReportMarket | undefined
  const status = c.req.query('status') as PublishStatus | undefined

  let rows: ReportRow[]
  if ((market === 'A' || market === 'US') && (status === 'draft' || status === 'published')) {
    rows = await sql<ReportRow[]>`
      SELECT * FROM reports
      WHERE market = ${market} AND status = ${status}
      ORDER BY report_date DESC
    `
  } else if (market === 'A' || market === 'US') {
    rows = await sql<ReportRow[]>`
      SELECT * FROM reports
      WHERE market = ${market}
      ORDER BY report_date DESC
    `
  } else if (status === 'draft' || status === 'published') {
    rows = await sql<ReportRow[]>`
      SELECT * FROM reports
      WHERE status = ${status}
      ORDER BY report_date DESC
    `
  } else {
    rows = await sql<ReportRow[]>`
      SELECT * FROM reports
      ORDER BY report_date DESC
    `
  }

  return c.json({ items: rows.map(toAdminReport) })
})

adminReports.get('/:id', async (c) => {
  const sql = c.get('sql')
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) {
    return c.json(badRequest('无效 id'), 400)
  }

  const rows = await sql<ReportRow[]>`SELECT * FROM reports WHERE id = ${id} LIMIT 1`
  const row = rows[0]
  if (!row) {
    return c.json({ error: '日报不存在' }, 404)
  }
  return c.json(toAdminReport(row))
})

adminReports.post('/', async (c) => {
  const sql = c.get('sql')
  const body = await c.req.json<AdminReportInput>().catch(() => null)
  if (!body) {
    return c.json(badRequest('JSON 无效'), 400)
  }

  const market = body.market
  const reportDate = body.reportDate
  if (market !== 'A' && market !== 'US') {
    return c.json(badRequest('market 必须是 A 或 US'), 400)
  }
  if (!isValidDate(reportDate)) {
    return c.json(badRequest('reportDate 格式应为 YYYY-MM-DD'), 400)
  }
  if (!body.title?.trim()) {
    return c.json(badRequest('title 必填'), 400)
  }

  const slug = (body.slug || buildReportSlug(market, reportDate)).trim()
  const markdown = body.bodyMarkdown || ''
  const html = markdown ? renderMarkdown(markdown) : ''
  const indices = JSON.stringify(body.indices || [])

  try {
    const rows = await sql<ReportRow[]>`
      INSERT INTO reports (
        slug, market, report_date, title, headline, summary, indices,
        body_markdown, body_html, source
      ) VALUES (
        ${slug},
        ${market},
        ${reportDate},
        ${body.title.trim()},
        ${body.headline || ''},
        ${body.summary || ''},
        ${indices}::jsonb,
        ${markdown},
        ${html},
        ${body.source || null}
      )
      RETURNING *
    `
    return c.json(toAdminReport(rows[0]!), 201)
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建失败'
    if (/unique|duplicate/i.test(message)) {
      return c.json({ error: 'slug 或 market+date 已存在' }, 409)
    }
    return c.json({ error: message }, 500)
  }
})

adminReports.patch('/:id', async (c) => {
  const sql = c.get('sql')
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) {
    return c.json(badRequest('无效 id'), 400)
  }

  const existing = await sql<ReportRow[]>`SELECT * FROM reports WHERE id = ${id} LIMIT 1`
  const current = existing[0]
  if (!current) {
    return c.json({ error: '日报不存在' }, 404)
  }

  const body = await c.req.json<Partial<AdminReportInput>>().catch(() => null)
  if (!body) {
    return c.json(badRequest('JSON 无效'), 400)
  }

  const market = body.market ?? current.market
  const reportDate = body.reportDate ?? String(current.report_date).slice(0, 10)
  if (market !== 'A' && market !== 'US') {
    return c.json(badRequest('market 必须是 A 或 US'), 400)
  }
  if (!isValidDate(reportDate)) {
    return c.json(badRequest('reportDate 格式应为 YYYY-MM-DD'), 400)
  }

  const title = body.title?.trim() || current.title
  const headline = body.headline ?? current.headline
  const summary = body.summary ?? current.summary
  const markdown = body.bodyMarkdown ?? current.body_markdown
  const html = body.bodyMarkdown !== undefined
    ? (markdown ? renderMarkdown(markdown) : '')
    : current.body_html
  const indices = JSON.stringify(body.indices ?? (typeof current.indices === 'string'
    ? JSON.parse(current.indices)
    : current.indices))
  const slug = body.slug?.trim() || current.slug
  const source = body.source !== undefined ? body.source : current.source

  try {
    const rows = await sql<ReportRow[]>`
      UPDATE reports SET
        slug = ${slug},
        market = ${market},
        report_date = ${reportDate},
        title = ${title},
        headline = ${headline},
        summary = ${summary},
        indices = ${indices}::jsonb,
        body_markdown = ${markdown},
        body_html = ${html},
        source = ${source}
      WHERE id = ${id}
      RETURNING *
    `
    return c.json(toAdminReport(rows[0]!))
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败'
    if (/unique|duplicate/i.test(message)) {
      return c.json({ error: 'slug 或 market+date 已存在' }, 409)
    }
    return c.json({ error: message }, 500)
  }
})

adminReports.post('/:id/publish', async (c) => {
  const sql = c.get('sql')
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) {
    return c.json(badRequest('无效 id'), 400)
  }

  const rows = await sql<ReportRow[]>`
    UPDATE reports
    SET status = 'published', published_at = COALESCE(published_at, now())
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows[0]) {
    return c.json({ error: '日报不存在' }, 404)
  }
  return c.json(toAdminReport(rows[0]))
})

adminReports.post('/:id/unpublish', async (c) => {
  const sql = c.get('sql')
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) {
    return c.json(badRequest('无效 id'), 400)
  }

  const rows = await sql<ReportRow[]>`
    UPDATE reports
    SET status = 'draft'
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows[0]) {
    return c.json({ error: '日报不存在' }, 404)
  }
  return c.json(toAdminReport(rows[0]))
})
