# 意思決定記録

重要な技術的意思決定を簡潔に記録します。

## 2026-07-06: 技術スタックを Cloudflare 前提で確定

`tasklog` は Cloudflare プラットフォーム前提で構築する。

### 確定内容

| 領域 | 採用 | 補足 |
| --- | --- | --- |
| フロント | React + TypeScript + Vite | |
| ルーター | TanStack Router | 型安全なルーティング |
| サーバー状態 | TanStack Query | |
| クライアント状態 | Zustand | UI 状態のみ |
| UI | shadcn/ui + Tailwind CSS | |
| バリデーション | Zod | フロント/バック共有 |
| バックエンド | Hono + Cloudflare Workers | |
| DB | Cloudflare D1（SQLite） | Drizzle ORM |
| 認証 | Better Auth | 自前 DB にテーブルを持つ |
| デプロイ/ツール | wrangler、pnpm モノレポ | |

### DB に D1（SQLite）を選んだ理由

- スタックを Cloudflare に統一し、運用とコストを最小化する
- ドメイン（workspace / project / ticket / comment）は素直なリレーショナルで、SQLite で十分に扱える
- 小チーム・個人プロジェクト用途では D1 の制約が実害になりにくい

### 受け入れる制約（トレードオフ）

- 大量同時書き込みには弱い
- Postgres 固有機能（jsonb・配列・強力な全文検索）は使わない
- 検索は SQLite の `LIKE`、必要になれば FTS5 で対応
- 将来 Postgres へ移行する場合は相応の手間がかかる

> 補足: 以前の AGENTS.md は「D1 を選ぶな」としていたが、Cloudflare 統一の方針を優先して本決定で上書きした。

### 認証に Better Auth を選んだ理由

- Cloudflare Workers + D1 上で動作し、自前 DB にユーザーテーブルを持てる
- Clerk は外部依存が強く、Supabase Auth は Cloudflare 前提から外れるため不採用

## 2026-07-06: デプロイ構成・認証プロバイダ・ID 方式を確定

### 1 Worker で web + API を配信

- `apps/web`（React ビルド成果物）と `apps/api`（Hono）を **単一の Worker** から配信する
- 静的アセットは Workers Assets、API は同一 Worker 内の Hono ルートで処理
- 別オリジンにならないため CORS が不要になり、運用もシンプル

### 認証は Google OAuth のみ

- Better Auth の Google Provider のみを有効化する
- メール/パスワードは実装しない（必要になれば後から追加）
- 必要なシークレット: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`、`BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`

### 主キーの ID 方式は UUIDv7（text）

- すべてのレコード主キー（`users.id`, `workspaces.id`, `tickets.id` など）は **UUIDv7 を `text` 型** で保持
- 理由:
  - Workers（JS）側で挿入前に生成でき、DB 採番に依存しない
  - 時刻順にソート可能で、SQLite の B-tree インデックス局所性が良い
  - 標準規格でツールの追従が安心
- **表示用キー**（`TASK-1` 等）の元になる `tickets.ticket_number` は別物で、**プロジェクトごとの連番 integer** を維持する
