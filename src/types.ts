export type ReportMarket = 'A' | 'US'
export type PublishStatus = 'draft' | 'published'

export interface ReportIndexQuote {
  name: string
  value: string
  changePct: number | null
  changeText: string
}

export interface ReportRow {
  id: string
  slug: string
  market: ReportMarket
  report_date: string
  title: string
  headline: string
  summary: string
  indices: ReportIndexQuote[] | string
  body_markdown: string
  body_html: string
  status: PublishStatus
  source: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportListItem {
  slug: string
  title: string
  date: string | null
  path: string
  market?: ReportMarket | null
}

export interface ReportListResponse {
  configured: boolean
  source: string | null
  items: ReportListItem[]
}

export interface ReportDetail {
  slug: string
  title: string
  date: string | null
  path: string
  market?: ReportMarket | null
  htmlUrl: string
  html: string
}

export interface ReportBrief {
  slug: string
  title: string
  date: string | null
  market: ReportMarket
  headline: string
  summary: string
  indices: ReportIndexQuote[]
}

export interface HomeMarketBriefItem {
  market: ReportMarket
  brief: ReportBrief | null
}

export interface HomeMarketBriefsResponse {
  configured: boolean
  source: string | null
  items: HomeMarketBriefItem[]
}

export interface AdminReportInput {
  market: ReportMarket
  reportDate: string
  title: string
  headline?: string
  summary?: string
  indices?: ReportIndexQuote[]
  bodyMarkdown?: string
  source?: string | null
  slug?: string
}

export interface Env {
  HYPERDRIVE?: Hyperdrive
  DATABASE_URL?: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
  ADMIN_JWT_SECRET: string
  PUBLIC_SITE_URL: string
  CORS_ORIGINS: string
}
