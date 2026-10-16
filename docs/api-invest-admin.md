# invest-admin 接口文档

面向管理端 `invest-admin` 的 API：登录鉴权 + 日报 CRUD / 发布。

| 环境 | Base URL |
|------|----------|
| 本地 | `http://127.0.0.1:8787` |
| 生产 | `https://api.zheninvest.com`（以实际绑定域名为准） |

未配置数据库时，`/v1/admin/reports*` 返回 `503`：`{ "error": "...", "configured": false }`。登录接口本身不依赖数据库。

---

## 鉴权

除登录 / 登出外，管理日报接口需鉴权，二选一：

1. **Header：** `Authorization: Bearer <token>`
2. **Cookie：** `invest_api_admin=<token>`（登录成功后服务端下发 HttpOnly Cookie）

Token 有效期 **7 天**。未授权返回：

```json
{ "error": "Unauthorized" }
```

状态码 `401`。

CORS：需带凭证时使用 `credentials: include`；允许源见服务端 `CORS_ORIGINS`（含本地 `http://localhost:5173` 等）。

---

## 认证

### POST `/v1/admin/auth/login`

**请求体**

```json
{
  "username": "admin",
  "password": "dev-password"
}
```

**响应 200**

```json
{
  "token": "<jwt>",
  "username": "admin"
}
```

同时设置 Cookie：`invest_api_admin`（`HttpOnly; Secure; SameSite=Lax; Max-Age=604800`）。

**响应 401**

```json
{ "error": "用户名或密码错误" }
```

---

### POST `/v1/admin/auth/logout`

清 Cookie。无需请求体。

**响应 200**

```json
{ "ok": true }
```

---

## 日报管理

默认 slug 规则（未传 `slug` 时）：

| market | slug 示例 |
|--------|-----------|
| `US` | `us-close-2026-10-14` |
| `A` | `ashare-close-2026-10-15` |

`(market, reportDate)` 与 `slug` 均唯一。

---

### GET `/v1/admin/reports`

列表（含 draft / published）。

| Query | 类型 | 说明 |
|-------|------|------|
| `market` | `A` \| `US` | 可选 |
| `status` | `draft` \| `published` | 可选 |

**响应 200**

```json
{
  "items": [
    {
      "id": 1,
      "slug": "us-close-2026-10-14",
      "market": "US",
      "reportDate": "2026-10-14",
      "title": "美股收盘日报 10/14",
      "headline": "三大指数小幅收涨",
      "summary": "科技股带动市场回暖。",
      "indices": [
        {
          "name": "标普500",
          "value": "",
          "changePct": 0.42,
          "changeText": ""
        }
      ],
      "bodyMarkdown": "## 概览\n\n今日美股收涨。",
      "bodyHtml": "<h2>概览</h2>\n<p>今日美股收涨。</p>",
      "status": "draft",
      "source": "local-dev",
      "publishedAt": null,
      "createdAt": "2026-10-15T10:03:55.308Z",
      "updatedAt": "2026-10-15T10:03:55.308Z"
    }
  ]
}
```

按 `report_date` 降序。

---

### GET `/v1/admin/reports/:id`

单条详情（含 markdown / html）。

**响应 200：** 同上单条对象结构。

**响应 400：** `{ "error": "无效 id" }`  
**响应 404：** `{ "error": "日报不存在" }`

---

### POST `/v1/admin/reports`

新建（默认 `status: draft`）。服务端会把 `bodyMarkdown` 渲染为 `bodyHtml`。

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `market` | `A` \| `US` | 是 | 市场 |
| `reportDate` | string | 是 | `YYYY-MM-DD` |
| `title` | string | 是 | 标题 |
| `headline` | string | 否 | 一句话标题 |
| `summary` | string | 否 | 摘要 |
| `indices` | `ReportIndexQuote[]` | 否 | 指数行情 |
| `bodyMarkdown` | string | 否 | Markdown 正文 |
| `source` | string \| null | 否 | 来源标记 |
| `slug` | string | 否 | 自定义 slug；默认按市场+日期生成 |

**示例**

```json
{
  "market": "US",
  "reportDate": "2026-10-14",
  "title": "美股收盘日报 10/14",
  "headline": "三大指数小幅收涨",
  "summary": "科技股带动市场回暖。",
  "indices": [{ "name": "标普500", "value": "5800", "changePct": 0.42, "changeText": "+0.42%" }],
  "bodyMarkdown": "## 概览\n\n今日美股收涨。",
  "source": "admin"
}
```

**响应 201：** 完整 Admin 日报对象。

**响应 400：** `market` / `reportDate` / `title` 校验失败  
**响应 409：** `{ "error": "slug 或 market+date 已存在" }`

---

### PATCH `/v1/admin/reports/:id`

部分更新。未传字段保持原值；若传了 `bodyMarkdown` 会重新渲染 `bodyHtml`。

**请求体：** 同创建字段，均为可选。

**响应 200：** 更新后的完整对象。  
**响应 404 / 409 / 400：** 同创建语义。

---

### POST `/v1/admin/reports/:id/publish`

发布。`status` → `published`；`publishedAt` 若为空则设为当前时间。

**响应 200：** 完整对象。  
**响应 404：** `{ "error": "日报不存在" }`

发布后会出现在 invest-nav 的公开接口中。

---

### POST `/v1/admin/reports/:id/unpublish`

撤回。`status` → `draft`（`publishedAt` 保留）。

**响应 200：** 完整对象。  
**响应 404：** `{ "error": "日报不存在" }`

撤回后公开接口不再返回该条。

---

## 共用类型

### `ReportMarket`

`"A"` | `"US"`

### `PublishStatus`

`"draft"` | `"published"`

### `ReportIndexQuote`

| 字段 | 类型 |
|------|------|
| `name` | string |
| `value` | string |
| `changePct` | number \| null |
| `changeText` | string |

### 调用示例（curl）

```bash
BASE=https://api.zheninvest.com   # 或 http://127.0.0.1:8787

TOKEN=$(curl -sS -X POST "$BASE/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"<password>"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])')

curl -sS -X POST "$BASE/v1/admin/reports" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"market":"A","reportDate":"2026-10-15","title":"A股收盘日报"}'

curl -sS -X POST "$BASE/v1/admin/reports/1/publish" \
  -H "Authorization: Bearer $TOKEN"
```
