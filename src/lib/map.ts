import type {
  ReportBrief,
  ReportDetail,
  ReportIndexQuote,
  ReportListItem,
  ReportRow,
} from '../types'

function parseIndices(value: ReportRow['indices']): ReportIndexQuote[] {
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    return value.slice(0, 10)
  }
  return value.toISOString().slice(0, 10)
}

export function toListItem(row: ReportRow): ReportListItem {
  return {
    slug: row.slug,
    title: row.title,
    date: formatDate(row.report_date),
    path: row.slug,
    market: row.market,
  }
}

export function toBrief(row: ReportRow): ReportBrief {
  return {
    slug: row.slug,
    title: row.title,
    date: formatDate(row.report_date),
    market: row.market,
    headline: row.headline,
    summary: row.summary,
    indices: parseIndices(row.indices),
  }
}

export function toDetail(row: ReportRow, siteUrl: string): ReportDetail {
  const base = siteUrl.replace(/\/$/, '')
  return {
    slug: row.slug,
    title: row.title,
    date: formatDate(row.report_date),
    path: row.slug,
    market: row.market,
    htmlUrl: `${base}/reports/${row.slug}`,
    html: row.body_html,
  }
}

export function toAdminReport(row: ReportRow) {
  return {
    id: Number(row.id),
    slug: row.slug,
    market: row.market,
    reportDate: formatDate(row.report_date),
    title: row.title,
    headline: row.headline,
    summary: row.summary,
    indices: parseIndices(row.indices),
    bodyMarkdown: row.body_markdown,
    bodyHtml: row.body_html,
    status: row.status,
    source: row.source,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
