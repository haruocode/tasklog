import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { createProjectSchema } from "@tasklog/shared";
import { authClient } from "../lib/auth-client";
import { ApiRequestError, createProject, listProjects } from "../lib/api";

function CreateProjectForm({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { name: string; key: string }) =>
      createProject(workspaceId, input),
    onSuccess: () => {
      setName("");
      setKey("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["projects", workspaceId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "作成に失敗しました"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createProjectSchema.safeParse({ name, key });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力が不正です");
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="プロジェクト名"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase())}
          placeholder="キー (例: TASK)"
          className="w-32 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {mutation.isPending ? "作成中…" : "作成"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function ProjectsPage() {
  const { workspaceId } = useParams({ strict: false });
  const { data: session, isPending } = authClient.useSession();

  const projectsQuery = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () => listProjects(workspaceId!),
    enabled: !!session && !!workspaceId,
  });

  if (isPending) {
    return <p className="p-8 text-gray-400">確認中…</p>;
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
        <p className="text-gray-600">ログインが必要です。</p>
        <Link to="/" className="text-sm text-blue-600 underline">
          トップへ戻ってログイン
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">プロジェクト</h1>
        <Link to="/workspaces" className="text-sm text-gray-500 hover:underline">
          ワークスペース一覧
        </Link>
      </div>

      <CreateProjectForm workspaceId={workspaceId!} />

      <section className="flex flex-col gap-2">
        {projectsQuery.isLoading && <p className="text-gray-400">読み込み中…</p>}
        {projectsQuery.isError && (
          <p className="text-red-600">
            {projectsQuery.error instanceof ApiRequestError
              ? projectsQuery.error.message
              : "読み込みに失敗しました"}
          </p>
        )}
        {projectsQuery.data?.length === 0 && (
          <p className="text-sm text-gray-500">
            まだプロジェクトがありません。上のフォームから作成してください。
          </p>
        )}
        {projectsQuery.data?.map((p) => (
          <Link
            key={p.id}
            to="/projects/$projectId/issues"
            params={{ projectId: p.id }}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50"
          >
            <span className="font-medium">{p.name}</span>
            <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
              {p.key}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
