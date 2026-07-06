import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ApiSuccess, HealthResponse } from "@tasklog/shared";
import { authClient } from "../lib/auth-client";

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("health check failed");
  const json = (await res.json()) as ApiSuccess<HealthResponse>;
  return json.data;
}

function AuthPanel() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <section className="rounded-lg border border-gray-200 p-4">
      <h2 className="mb-3 text-sm font-medium text-gray-500">アカウント</h2>
      {isPending ? (
        <p className="text-gray-400">確認中…</p>
      ) : session ? (
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{session.user.name}</p>
            <p className="truncate text-sm text-gray-500">
              {session.user.email}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/workspaces"
              className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
            >
              ワークスペースへ
            </Link>
            <button
              onClick={() => authClient.signOut()}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ログアウト
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() =>
            authClient.signIn.social({ provider: "google", callbackURL: "/" })
          }
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Google でログイン
        </button>
      )}
    </section>
  );
}

export function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">tasklog</h1>
        <p className="mt-1 text-sm text-gray-500">
          軽量チケット管理システム — 開発中の足場
        </p>
      </div>

      <AuthPanel />

      <section className="rounded-lg border border-gray-200 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500">
          API / DB ヘルスチェック
        </h2>
        {isLoading && <p className="text-gray-400">確認中…</p>}
        {isError && <p className="text-red-600">API に接続できません</p>}
        {data && (
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-gray-500">API</dt>
            <dd className="font-mono">{data.status}</dd>
            <dt className="text-gray-500">D1</dt>
            <dd className="font-mono">{data.db}</dd>
            <dt className="text-gray-500">time</dt>
            <dd className="font-mono text-xs">{data.time}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
