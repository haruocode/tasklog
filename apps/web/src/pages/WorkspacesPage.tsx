import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { createWorkspaceSchema } from "@tasklog/shared";
import { authClient } from "../lib/auth-client";
import { ApiRequestError, createWorkspace, listWorkspaces } from "../lib/api";

function CreateWorkspaceForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      setName("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "作成に失敗しました"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createWorkspaceSchema.safeParse({ name });
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
          placeholder="新しいワークスペース名"
          className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-900 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="shrink-0 rounded-md bg-gray-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          {mutation.isPending ? "作成中…" : "作成"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}

export function WorkspacesPage() {
  const { data: session, isPending } = authClient.useSession();

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: listWorkspaces,
    enabled: !!session,
  });

  if (isPending) {
    return <p className="p-8 text-gray-400 dark:text-gray-500">確認中…</p>;
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
        <p className="text-gray-600 dark:text-gray-300">ワークスペースを見るにはログインが必要です。</p>
        <Link to="/" className="text-sm text-blue-600 dark:text-blue-400 underline">
          トップへ戻ってログイン
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">ワークスペース</h1>
        <Link to="/" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
          トップ
        </Link>
      </div>

      <CreateWorkspaceForm />

      <section className="flex flex-col gap-2">
        {workspacesQuery.isLoading && <p className="text-gray-400 dark:text-gray-500">読み込み中…</p>}
        {workspacesQuery.isError && (
          <p className="text-red-600 dark:text-red-400">
            {workspacesQuery.error instanceof ApiRequestError
              ? workspacesQuery.error.message
              : "読み込みに失敗しました"}
          </p>
        )}
        {workspacesQuery.data?.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            まだワークスペースがありません。上のフォームから作成してください。
          </p>
        )}
        {workspacesQuery.data?.map((ws) => (
          <Link
            key={ws.id}
            to="/workspaces/$workspaceId/projects"
            params={{ workspaceId: ws.id }}
            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <span className="font-medium">{ws.name}</span>
            <span className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
              {ws.role}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
