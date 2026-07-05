# 認証（Better Auth + Google OAuth）

認証は **Better Auth** を土台にし、ログイン手段は **Google OAuth のみ** を有効化しています
（`docs/decisions.md` 参照）。

## 構成

- サーバー: `apps/api/src/auth.ts` の `createAuth(env)` が Better Auth インスタンスを生成。
  Cloudflare Workers ではシークレットと D1 が `env`（リクエスト毎）にしか無いため、
  モジュール単位のシングルトンではなく **リクエスト毎に生成** している。
- ルート: `apps/api/src/index.ts` が `/api/auth/*` を Better Auth のハンドラに委譲。
- DB: `users` / `sessions` / `accounts` / `verifications` テーブル（`packages/db/src/schema.ts`）。
  `users` は AGENTS.md のドメインユーザーであり、同時に Better Auth の `user` モデルでもある
  （ドメインの FK はすべて `users` を参照）。
- ID: Better Auth 生成分も含め全 PK を UUIDv7 に統一（`advanced.database.generateId`）。
- クライアント: `apps/web/src/lib/auth-client.ts`。同一オリジン配信のため `baseURL` 不要。

## 必要なシークレット

`apps/api/.dev.vars`（ローカル、gitignore 済み）または `wrangler secret put`（本番）:

| 変数 | 用途 |
| --- | --- |
| `BETTER_AUTH_URL` | アプリのベース URL（ローカルは `http://localhost:8787`） |
| `BETTER_AUTH_SECRET` | セッション署名鍵（`openssl rand -base64 32`） |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |

## Google OAuth クライアントの作成手順

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（or 選択）。
2. 「APIとサービス」→「OAuth 同意画面」を設定（External / テストユーザーに自分を追加）。
3. 「認証情報」→「認証情報を作成」→「OAuth クライアント ID」→「ウェブアプリケーション」。
4. **承認済みのリダイレクト URI** に以下を登録:
   - ローカル: `http://localhost:8787/api/auth/callback/google`
   - 本番: `https://<your-domain>/api/auth/callback/google`
5. 発行された Client ID / Secret を `.dev.vars`（本番は `wrangler secret put`）に設定。

## ローカルでのログイン確認

Google のコールバックはベース URL に戻るため、認証を試すときは **単一 Worker 配信**
（`pnpm dev`、`http://localhost:8787`）を使う。ブラウザで開き「Google でログイン」を押す
→ 同意 → `/` に戻り、セッションが表示されれば成功。

> `apps/web` の `vite`（:5173、HMR 用）は API をプロキシするが、OAuth コールバックの
> オリジンが異なるため、認証フローの確認には `pnpm dev`（:8787）を推奨。

## エンドポイント（Better Auth 提供、抜粋）

```txt
GET  /api/auth/get-session            現在のセッション取得（未ログインは null）
POST /api/auth/sign-in/social         プロバイダ認可 URL を返す（provider: "google"）
GET  /api/auth/callback/google        Google からのコールバック
POST /api/auth/sign-out               ログアウト
```
