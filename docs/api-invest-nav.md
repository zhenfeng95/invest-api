# invest-nav 接口文档

面向用户站 `invest-nav`（zheninvest.com）的**公开只读** API。无需鉴权。

| 环境 | Base URL |
|------|----------|
| 本地 | `http://127.0.0.1:8787` |
| 生产 | `https://api.zheninvest.com`（以实际绑定域名为准） |

对接映射（原 invest-nav 本地 `/api/*`）：

| invest-nav | invest-api |
|------------|------------|
| `/api/reports/home` | `/v1/reports/home` |
| `/api/reports` | `/v1/reports` |
| `/api/reports/:slug` | `/v1/reports/:slug` |

CORS：生产允许 `https://zheninvest.com`；本地允许 `http://localhost:3000`、`http://localhost:5173`、`http://localhost:8787`。

未配置数据库时，`/v1/reports*` 返回 `503`：`{ "error": "...", "configured": false }`。

---

## GET `/health`

健康检查（不依赖数据库）。

**响应 200**

```json
{ "ok": true, "service": "invest-api" }
```

---

## GET `/v1/reports/home`

首页：美股 / A 股各自最新一条 **published** brief。

**Cache-Control：** `public, s-maxage=600, stale-while-revalidate=3600`

**响应 200**

```json
{
  "configured": true,
  "source": "db",
  "items": [
    {
      "market": "US",
      "brief": {
        "slug": "us-close-2026-10-14",
        "title": "美股收盘日报 10/14",
        "date": "2026-10-14",
        "market": "US",
        "headline": "三大指数小幅收涨",
        "summary": "科技股带动市场回暖。",
        "indices": [
          {
            "name": "标普500",
            "value": "",
            "changePct": 0.42,
            "changeText": ""
          }
        ]
      }
    },
    {
      "market": "A",
      "brief": null
    }
  ]
}
```

- `items` 固定顺序：先 `US`，后 `A`
- 该市场无已发布日报时 `brief` 为 `null`

---

## GET `/v1/reports`

已发布日报列表。

| Query | 类型 | 说明 |
|-------|------|------|
| `market` | `A` \| `US` | 可选；不传则返回全部已发布 |

**示例：** `GET /v1/reports?market=US`

**Cache-Control：** 有数据时 `public, s-maxage=600, stale-while-revalidate=3600`；空列表 `no-store`

**响应 200**

```json
{
  "configured": true,
  "source": "db",
  "items": [
    {
      "slug": "us-close-2026-10-14",
      "title": "美股收盘日报 10/14",
      "date": "2026-10-14",
      "path": "us-close-2026-10-14",
      "market": "US"
    }
  ]
}
```

按 `report_date` 降序。

---

## GET `/v1/reports/:slug`

已发布详情（含渲染后的 HTML）。

**Cache-Control：** `public, s-maxage=1800, stale-while-revalidate=86400`

**响应 200**

```json
{
  "slug": "us-close-2026-10-14",
  "title": "美股收盘日报 10/14",
  "date": "2026-10-14",
  "path": "us-close-2026-10-14",
  "market": "US",
  "htmlUrl": "https://zheninvest.com/reports/us-close-2026-10-14",
  "html": "<h2>概览</h2>\n<p>今日美股收涨。</p>"
}
```

**响应 404**

```json
{ "error": "日报不存在" }
```

---

## 共用类型

### `ReportMarket`

`"A"` | `"US"`

### `ReportIndexQuote`

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 指数名称 |
| `value` | string | 点位（可空字符串） |
| `changePct` | number \| null | 涨跌幅（小数，如 `0.42` 表示 0.42%） |
| `changeText` | string | 涨跌文案（可空） |

响应对齐 invest-nav 的 `types/report.ts`。
