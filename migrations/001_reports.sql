-- invest-api: 收盘日报
CREATE TYPE report_market AS ENUM ('A', 'US');
CREATE TYPE publish_status AS ENUM ('draft', 'published');

CREATE TABLE IF NOT EXISTS reports (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  market          report_market NOT NULL,
  report_date     DATE NOT NULL,
  title           TEXT NOT NULL,
  headline        TEXT NOT NULL DEFAULT '',
  summary         TEXT NOT NULL DEFAULT '',
  indices         JSONB NOT NULL DEFAULT '[]'::jsonb,
  body_markdown   TEXT NOT NULL DEFAULT '',
  body_html       TEXT NOT NULL DEFAULT '',
  status          publish_status NOT NULL DEFAULT 'draft',
  source          TEXT,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (market, report_date)
);

CREATE INDEX IF NOT EXISTS reports_list_idx
  ON reports (status, market, report_date DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_set_updated_at ON reports;
CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
