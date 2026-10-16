# invest-api

Zhen Invest 公开/管理 API（Cloudflare Workers + Hyperdrive + PostgreSQL）。

用户站 `zheninvest.com` 继续静态壳，日报等动态数据通过本服务读取。管理端登录后录入、发布日报。

## 接口契约（v1）

### 公开（只读）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/v1/reports/home` | 首页美股/A股最新 published brief |
| GET | `/v1/reports?market=US` | 已发布列表 |
| GET | `/v1/reports/:slug` | 已发布详情（含 html） |

响应对齐 `invest-nav` 的 `types/report.ts`。

### 管理（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/admin/auth/login` | `{ username, password }` → `{ token }` |
| POST | `/v1/admin/auth/logout` | 清 Cookie |
| GET | `/v1/admin/reports` | 列表（可 `?market=&status=`） |
| GET | `/v1/admin/reports/:id` | 详情（含 markdown） |
| POST | `/v1/admin/reports` | 新建 |
| PATCH | `/v1/admin/reports/:id` | 更新 |
| POST | `/v1/admin/reports/:id/publish` | 发布 |
| POST | `/v1/admin/reports/:id/unpublish` | 撤回 |

鉴权：`Authorization: Bearer <token>` 或 HttpOnly Cookie。

## 本地开发

```bash
cp .dev.vars.example .dev.vars
# 编辑 ADMIN_* 与 DATABASE_URL（本地可直连 Postgres；生产用 Hyperdrive）

# 在 Postgres 执行
psql "$DATABASE_URL" -f migrations/001_reports.sql

npm install
npm run dev
```

## 生产部署

1. 准备托管 Postgres（Neon / Supabase / RDS 等）
2. 执行 `migrations/001_reports.sql`
3. Cloudflare 创建 Hyperdrive，指向该库
4. 在 `wrangler.jsonc` 填入：

```jsonc
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<YOUR_HYPERDRIVE_ID>" }]
```

5. 配置 secrets：

```bash
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put ADMIN_JWT_SECRET
```

6. 绑定自定义域名（如 `api.zheninvest.com`）后：

```bash
npm run deploy
```

## 用户站对接

将 invest-nav 中：

- `/api/reports/home` → `https://api.zheninvest.com/v1/reports/home`
- `/api/reports` → `https://api.zheninvest.com/v1/reports`
- `/api/reports/:slug` → `https://api.zheninvest.com/v1/reports/:slug`

或在 invest-nav Nitro 做同源 BFF 代理。
