import { useQuery } from "@tanstack/react-query";
import type { ApiSuccess, HealthResponse } from "@tasklog/shared";

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("health check failed");
  const json = (await res.json()) as ApiSuccess<HealthResponse>;
  return json.data;
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
