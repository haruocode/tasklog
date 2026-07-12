import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { ApiRequestError, getIssue } from "../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "../lib/issue-labels";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export function IssueDetailPage() {
  const { projectId, issueId } = useParams({ strict: false });
  const { data: session, isPending } = authClient.useSession();

  const issueQuery = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => getIssue(issueId!),
    enabled: !!session && !!issueId,
  });

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
      <Link
        to="/projects/$projectId/issues"
        params={{ projectId: projectId! }}
        className="text-sm text-gray-500 hover:underline"
      >
        ← イシュー一覧
      </Link>

      {issueQuery.isLoading && <p className="text-gray-400">読み込み中…</p>}
      {issueQuery.isError && (
        <p className="text-red-600">
          {issueQuery.error instanceof ApiRequestError
            ? issueQuery.error.message
            : "読み込みに失敗しました"}
        </p>
      )}

      {issueQuery.data && (
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <span className="font-mono text-xs text-gray-500">
              {issueQuery.data.key}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              {issueQuery.data.title}
            </h1>
          </header>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-4">
            <Field label="ステータス">
              {STATUS_LABELS[issueQuery.data.status]}
            </Field>
            <Field label="種別">{TYPE_LABELS[issueQuery.data.type]}</Field>
            <Field label="優先度">
              {PRIORITY_LABELS[issueQuery.data.priority]}
            </Field>
            <Field label="担当者">
              {issueQuery.data.assignee?.name ?? (
                <span className="text-gray-400">未割り当て</span>
              )}
            </Field>
            <Field label="報告者">{issueQuery.data.reporter.name}</Field>
          </dl>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-500">説明</h2>
            {issueQuery.data.description ? (
              <p className="whitespace-pre-wrap text-sm text-gray-900">
                {issueQuery.data.description}
              </p>
            ) : (
              <p className="text-sm text-gray-400">説明はありません。</p>
            )}
          </section>
        </article>
      )}
    </main>
  );
}
