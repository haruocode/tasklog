# AGENTS.md

このファイルは、このリポジトリで作業する AI コーディングエージェント向けのガイドラインです。

## プロジェクト概要

`tasklog` は、Backlog・GitHub Issues・Linear などのツールに着想を得た、軽量なチケット管理システムです。

Backlog を完全に再現することが目的ではありません。最初のターゲットは、個人プロジェクトや小規模チーム向けの、小さく実用的なイシュートラッカーです。

主要な概念:

- Workspace（ワークスペース）
- Project（プロジェクト）
- Issue（イシュー）
- Comment（コメント）
- Member（メンバー）
- Status（ステータス）
- Priority（優先度）
- Activity log（アクティビティログ）

初期プロダクトは、シンプルさ・速度・分かりやすい UX を重視します。

## プロダクトの方向性

最小限だが役に立つチケット管理アプリを作ります。

MVP がサポートすべきもの:

- ユーザー認証
- ワークスペース作成
- プロジェクト作成
- イシュー作成
- イシュー一覧
- イシュー詳細
- ステータス変更
- 優先度変更
- 担当者変更
- コメント
- 基本的なフィルタリング
- 基本的な検索

高度な機能を早い段階で作り込むのは避けてください。

以下はコア体験が安定するまで後回しにします:

- ガントチャート
- Wiki
- ファイル添付
- Slack 連携
- メール通知
- GitHub 連携
- カスタムフィールド
- 複雑な権限管理
- Webhook
- 公開 API
- 課金
- 多言語対応

## 推奨技術スタック

強い理由がない限り、以下のスタックを使用してください。

### フロントエンド

- React
- TypeScript
- Vite
- TanStack Router または React Router
- TanStack Query
- クライアント状態が必要な場合は Zustand
- shadcn/ui または他のシンプルなコンポーネントシステム
- Tailwind CSS

### バックエンド

- Hono
- TypeScript
- Cloudflare Workers または Node 互換ランタイム

### データベース

- PostgreSQL
- Drizzle ORM

推奨のマネージド DB:

- Supabase Postgres
- Neon Postgres

リレーショナルモデリング・検索・将来のマイグレーションが難しくなる場合、初期バージョンで SQLite/D1 を選ばないでください。

### 認証

以下のいずれかを推奨:

- Supabase Auth
- Better Auth
- Clerk

初期バージョンでは、認証はシンプルに保ちます。

## リポジトリ構成

モノレポ構成を推奨します。

```txt
tasklog/
  apps/
    web/
    api/
  packages/
    db/
    ui/
    shared/
  docs/
  AGENTS.md
  README.md
  package.json
  pnpm-workspace.yaml
```

各パッケージの責務:

```txt
apps/web
  React フロントエンド

apps/api
  Hono API サーバー

packages/db
  Drizzle スキーマ、マイグレーション、DB クライアント

packages/ui
  必要に応じた共有 UI コンポーネント

packages/shared
  共有型、定数、バリデーションスキーマ

docs
  プロダクトメモ、アーキテクチャメモ、意思決定記録
```

パッケージマネージャーには `pnpm` を使用してください。

## 命名規則

明確なドメイン名を使用してください。

推奨:

- `workspace`
- `project`
- `issue`
- `comment`
- `member`
- `activity`
- `assignee`
- `reporter`

以下のような曖昧な名前は避けてください:

- `data`
- `item`
- `thing`
- `object`
- `manager`

内部では、強い理由がない限り `ticket` ではなく `issue` を使用してください。プロダクトとしては引き続き「チケット管理システム」と表現できます。

## ドメインモデル

初期テーブルは、以下のモデルに近い形にしてください。

```txt
users
- id
- name
- email
- avatar_url
- created_at
- updated_at

workspaces
- id
- name
- owner_id
- created_at
- updated_at

workspace_members
- id
- workspace_id
- user_id
- role
- created_at
- updated_at

projects
- id
- workspace_id
- name
- key
- description
- created_at
- updated_at

issues
- id
- project_id
- issue_number
- title
- description
- type
- status
- priority
- assignee_id
- reporter_id
- due_date
- created_at
- updated_at

issue_comments
- id
- issue_id
- user_id
- body
- created_at
- updated_at

issue_activities
- id
- issue_id
- user_id
- action
- before_value
- after_value
- created_at
```

イシューキーは以下のように表示します:

```txt
TASK-1
TASK-2
OTOMO-1
CHAT-1
```

これは以下から生成できます:

```txt
projects.key + "-" + issues.issue_number
```

`issue_number` はプロジェクトごとにスコープされるべきです。

## イシューのステータス

初期バージョンでは固定のステータスを使用します。

```ts
const ISSUE_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CLOSED",
] as const;
```

UI ラベルは日本語でも英語でも構いません。

日本語ラベルの例:

```txt
TODO         未対応
IN_PROGRESS 対応中
IN_REVIEW   レビュー中
DONE        完了
CLOSED      クローズ
```

MVP ではカスタムワークフローを作らないでください。

## イシュータイプ

まずは固定のイシュータイプを使用します。

```ts
const ISSUE_TYPES = ["TASK", "BUG", "FEATURE", "IMPROVEMENT"] as const;
```

ラベルの例:

```txt
TASK        タスク
BUG         バグ
FEATURE     機能追加
IMPROVEMENT 改善
```

## 優先度

まずは固定の優先度を使用します。

```ts
const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
```

ラベルの例:

```txt
LOW    低
MEDIUM 中
HIGH   高
URGENT 緊急
```

## API 設計

REST スタイルの API から始めます。

推奨エンドポイント:

```txt
GET    /api/workspaces
POST   /api/workspaces

GET    /api/workspaces/:workspaceId
PATCH  /api/workspaces/:workspaceId

GET    /api/workspaces/:workspaceId/projects
POST   /api/workspaces/:workspaceId/projects

GET    /api/projects/:projectId
PATCH  /api/projects/:projectId

GET    /api/projects/:projectId/issues
POST   /api/projects/:projectId/issues

GET    /api/issues/:issueId
PATCH  /api/issues/:issueId
DELETE /api/issues/:issueId

GET    /api/issues/:issueId/comments
POST   /api/issues/:issueId/comments

PATCH  /api/comments/:commentId
DELETE /api/comments/:commentId
```

API レスポンスは予測可能に保ってください。

以下のスタイルを推奨:

```ts
{
  data: ...
}
```

エラーの場合:

```ts
{
  error: {
    code: "ISSUE_NOT_FOUND",
    message: "Issue not found"
  }
}
```

## フロントエンドのルート

推奨する初期ルート:

```txt
/login
/workspaces
/workspaces/:workspaceId/projects
/projects/:projectId/issues
/projects/:projectId/issues/new
/projects/:projectId/issues/:issueId
/projects/:projectId/settings
```

メインのアプリレイアウトには以下を含めます:

- ヘッダー
- ワークスペース切り替え
- プロジェクトナビゲーション
- メインコンテンツエリア

## UI 原則

装飾より分かりやすさを優先してください。

このアプリは実用的な業務ツールとして感じられるべきです。

シンプルなレイアウトを使用:

- イシュー一覧にはテーブル
- 作成/編集にはフォーム
- イシュー詳細には詳細パネル
- コメントはイシュー説明の下に

過度なアニメーション UI は避けてください。

イシューのワークフローが役立つようになる前に、ダッシュボードを作らないでください。

## バリデーション

可能な限り共有バリデーションスキーマを使用してください。

推奨:

- Zod
- Valibot

現実的な範囲で、フロントエンドとバックエンドの両方にバリデーションを置くべきです。

例:

- イシューのタイトルは必須
- プロジェクトキーは必須
- プロジェクトキーは英数大文字であるべき
- ステータスは許可されたステータスのいずれか
- 優先度は許可された優先度のいずれか

## 権限

MVP では権限をシンプルに保ちます。

ワークスペースのロール:

```txt
OWNER
ADMIN
MEMBER
```

初期の挙動:

- OWNER はワークスペースとメンバーを管理できる
- ADMIN はプロジェクトとイシューを管理できる
- MEMBER はイシュー/コメントを作成・更新できる

早い段階で権限ルールを作り込みすぎないでください。

## アクティビティログ

イシューへの重要な変更を記録します。

例:

- イシュー作成
- ステータス変更
- 優先度変更
- 担当者変更
- タイトル変更
- 説明変更
- コメント追加

アクティビティの保存はシンプルに保ってください。

MVP で複雑な監査システムを作らないでください。

## 検索とフィルタリング

初期フィルター:

- ステータス
- 優先度
- 担当者
- イシュータイプ
- キーワード
- 期日

キーワード検索は、当初はシンプルな SQL の `LIKE` または `ILIKE` で構いません。

全文検索は後から追加できます。

## テスト方針

過剰なカバレッジより実用的なテストを優先してください。

推奨テスト:

- 共有ユーティリティのユニットテスト
- 重要なエンドポイントの API テスト
- 重要なフォームのコンポーネントテスト
- コアなイシューワークフローの E2E テスト

コアな E2E フロー:

```txt
login
create workspace
create project
create issue
change issue status
add comment
filter issue list
```

実装の詳細のテストに時間をかけすぎないでください。

## コードスタイル

TypeScript を厳格に使用してください。

明確な理由がない限り `any` は避けてください。

推奨:

- 小さな関数
- 境界での明示的な型付け
- ドメイン固有の名前
- シンプルなエラーハンドリング
- 分かりやすいフォルダ構成

避けるべきこと:

- 早すぎる深い抽象化
- 早すぎる汎用ヘルパー
- 巨大なコンポーネント
- UI コンポーネント内への API 呼び出しの直接混入
- UI イベントハンドラー内に隠されたビジネスロジック

## フロントエンドのデータ取得

サーバー状態には TanStack Query を使用してください。

サーバー状態を Zustand に二重管理しないでください。

Zustand は以下に使用できます:

- UI 状態
- サイドバーの開閉
- 一時的なフィルター
- ローカル設定

クエリキーは一貫して使用してください。

例:

```ts
["workspaces"][("workspace", workspaceId)][("projects", workspaceId)][
  ("issues", projectId, filters)
][("issue", issueId)][("issue-comments", issueId)];
```

## エラーハンドリング

有用なエラーメッセージを表示してください。

静かに失敗させないでください。

API エラーには安定したエラーコードを返してください。

例:

```txt
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
WORKSPACE_NOT_FOUND
PROJECT_NOT_FOUND
ISSUE_NOT_FOUND
COMMENT_NOT_FOUND
```

## 環境変数

`.env.example` を使用してください。

シークレットは絶対にコミットしないでください。

想定される変数の例:

```txt
DATABASE_URL=
AUTH_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

実際に使用する変数のみを含めてください。

## ドキュメント

ドキュメントは軽量かつ有用に保ってください。

推奨ドキュメント:

```txt
docs/
  product.md
  architecture.md
  database.md
  decisions.md
```

重要な意思決定は簡潔に記録してください。

例:

```md
# 意思決定: Cloudflare D1 ではなく PostgreSQL を使用する

理由:

- ドメインがリレーショナルである
- 将来のフィルタリングと検索が容易になる
- 本番 SaaS へのマイグレーションが容易になる
```

## 開発の優先順位

以下の順序で作ってください:

1. プロジェクトセットアップ
2. データベーススキーマ
3. 認証
4. ワークスペース作成
5. プロジェクト作成
6. イシュー作成
7. イシュー一覧
8. イシュー詳細
9. ステータス更新
10. コメント
11. フィルター
12. アクティビティログ

ダッシュボード・分析・連携から始めないでください。

## MVP 完了基準

ユーザーが以下を行えるようになったとき、MVP は完了です:

- サインイン
- ワークスペース作成
- プロジェクト作成
- イシュー作成
- イシュー一覧の表示
- イシュー詳細を開く
- イシューのステータス更新
- イシューの担当者割り当て
- コメント追加
- ステータスと担当者によるイシューのフィルタリング

これが動作すれば、このアプリは実用的なチケット管理システムです。

## AI エージェントへの指示

このリポジトリで作業する際は:

- 小さく段階的な変更を優先する
- 各変更の後もアプリが動作する状態を保つ
- スキーマ変更時は型を更新する
- スキーマ変更時はマイグレーションを更新する
- 依頼されていない大きな機能を勝手に作らない
- 不要な依存関係を追加しない
- 理由を説明せずに選定済みスタックを変更しない
- 重要な前提を隠さない
- 巧妙な抽象化より明快な実装を優先する
- コメントは非自明な挙動を説明する場合のみ追加する
- 日本語の UI ラベルは許容するが、内部コードは英語名を使う

機能の実装を依頼されたら、まず以下を特定してください:

- どの app/package が影響を受けるか
- データベース変更が必要か
- API 変更が必要か
- フロントエンド変更が必要か
- テストやドキュメントの更新が必要か

## デフォルト言語

内部コード・ファイル名・データベースフィールド・API 名は英語にすべきです。

ユーザー向けの UI は日本語で構いません。

例:

```txt
Internal: issue, project, workspace, assignee
UI: 課題, プロジェクト, ワークスペース, 担当者
```

## 現時点での非目標

明示的に依頼されない限り、以下は実装しないでください:

- 課金
- メールによる組織招待
- 複雑な RBAC
- Git 連携
- Slack 連携
- Wiki
- ガントチャート
- AI によるイシュー生成
- ファイルアップロード
- 公開イシューページ
- モバイルアプリ

## 最初のマイルストーン案

マイルストーン 1: ローカル MVP

スコープ:

- ローカル開発環境のセットアップ
- PostgreSQL 接続
- Drizzle スキーマ
- 基本的な認証
- ワークスペースの CRUD
- プロジェクトの CRUD
- イシューの CRUD
- コメントの CRUD
- シンプルなイシュー一覧フィルター

このマイルストーンは、高度な機能を追加する前に、コアプロダクトが有用であることを証明するためのものです。
