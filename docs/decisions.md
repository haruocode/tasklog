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
- ドメイン（workspace / project / issue / comment）は素直なリレーショナルで、SQLite で十分に扱える
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
- メール/パスワードから開始し、必要になれば OAuth を追加する
