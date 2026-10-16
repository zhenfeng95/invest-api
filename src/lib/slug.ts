import type { ReportMarket } from '../types'

export function buildReportSlug(market: ReportMarket, reportDate: string): string {
  const prefix = market === 'A' ? 'ashare-close' : 'us-close'
  return `${prefix}-${reportDate}`
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
