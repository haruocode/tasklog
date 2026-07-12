import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  createIssueSchema,
  type IssueFilters,
  type IssuePriority,
  type IssueType,
} from "@tasklog/shared";
import { authClient } from "../lib/auth-client";
import { ApiRequestError, createIssue, listIssues, listMembers } from "../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "../lib/issue-labels";

function CreateIssueForm({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IssueType>("TASK");
  const [priority, setPriority] = useState<IssuePriority>("MEDIUM");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { title: string; type: IssueType; priority: IssuePriority }) =>
      createIssue(projectId, input),
    onSuccess: () => {
      setTitle("");
      setType("TASK");
      setPriority("MEDIUM");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "作成に失敗しました"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createIssueSchema.safeParse({ title, type, priority });
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="イシューのタイトル"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as IssueType)}
          className="rounded-md border border-gray-300 px-2 py-2 text-sm"
        >
          {ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as IssuePriority)}
          className="rounded-md border border-gray-300 px-2 py-2 text-sm"
        >
          {ISSUE_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
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

// "" means "all" for a select filter.
const ALL = "";

export function IssuesPage() {
  const { projectId } = useParams({ strict: false });
  const { data: session, isPending } = authClient.useSession();

  const [status, setStatus] = useState<IssueFilters["status"] | "">(ALL);
  const [priority, setPriority] = useState<IssueFilters["priority"] | "">(ALL);
  const [type, setType] = useState<IssueFilters["type"] | "">(ALL);
  const [assigneeId, setAssigneeId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const membersQuery = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => listMembers(projectId!),
    enabled: !!session && !!projectId,
  });

  // Debounce the keyword so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const filters: IssueFilters = {
    status: status || undefined,
    priority: priority || undefined,
    type: type || undefined,
    assigneeId: assigneeId || undefined,
    q: debouncedKeyword || undefined,
  };

  const issuesQuery = useQuery({
    queryKey: ["issues", projectId, filters],
    queryFn: () => listIssues(projectId!, filters),
    enabled: !!session && !!projectId,
  });

  const memberName = new Map(membersQuery.data?.map((m) => [m.id, m.name]));

  if (isPending) {
    return <p className="p-8 text-gray-400">確認中…</p>;
  }

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-8">
        <p className="text-gray-600">ログインが必要です。</p>
        <Link to="/" className="text-sm text-blue-600 underline">
          トップへ戻ってログイン
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">イシュー</h1>
        <Link to="/workspaces" className="text-sm text-gray-500 hover:underline">
          ワークスペース一覧
        </Link>
      </div>

      <CreateIssueForm projectId={projectId!} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="タイトルで検索…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value={ALL}>全ステータス</option>
          {ISSUE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value={ALL}>全優先度</option>
          {ISSUE_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value={ALL}>全種別</option>
          {ISSUE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">全担当者</option>
          {membersQuery.data?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <section className="flex flex-col gap-2">
        {issuesQuery.isLoading && <p className="text-gray-400">読み込み中…</p>}
        {issuesQuery.isError && (
          <p className="text-red-600">
            {issuesQuery.error instanceof ApiRequestError
              ? issuesQuery.error.message
              : "読み込みに失敗しました"}
          </p>
        )}
        {issuesQuery.data?.length === 0 && (
          <p className="text-sm text-gray-500">
            {status || priority || type || assigneeId || debouncedKeyword
              ? "条件に一致するイシューがありません。"
              : "まだイシューがありません。上のフォームから作成してください。"}
          </p>
        )}
        {issuesQuery.data && issuesQuery.data.length > 0 && (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">キー</th>
                <th className="py-2 pr-3 font-medium">タイトル</th>
                <th className="py-2 pr-3 font-medium">種別</th>
                <th className="py-2 pr-3 font-medium">優先度</th>
                <th className="py-2 pr-3 font-medium">担当者</th>
                <th className="py-2 font-medium">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {issuesQuery.data.map((issue) => (
                <tr key={issue.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-mono text-xs">
                    <Link
                      to="/projects/$projectId/issues/$issueId"
                      params={{ projectId: projectId!, issueId: issue.id }}
                      className="text-blue-600 hover:underline"
                    >
                      {issue.key}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 font-medium">{issue.title}</td>
                  <td className="py-2 pr-3 text-gray-600">
                    {TYPE_LABELS[issue.type]}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {PRIORITY_LABELS[issue.priority]}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {issue.assigneeId ? (
                      (memberName.get(issue.assigneeId) ?? "—")
                    ) : (
                      <span className="text-gray-400">未割り当て</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600">
                    {STATUS_LABELS[issue.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
