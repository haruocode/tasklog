import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  createCommentSchema,
  type TicketDetail,
  type UpdateTicketInput,
} from "@tasklog/shared";
import { authClient } from "../lib/auth-client";
import {
  ApiRequestError,
  createComment,
  getTicket,
  listComments,
  listMembers,
  updateTicket,
} from "../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "../lib/ticket-labels";

function CommentsSection({ ticketId }: { ticketId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: () => listComments(ticketId),
  });

  const mutation = useMutation({
    mutationFn: (input: { body: string }) => createComment(ticketId, input),
    onSuccess: () => {
      setBody("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "投稿に失敗しました"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createCommentSchema.safeParse({ body });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "入力が不正です");
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-medium text-gray-500">コメント</h2>

      <div className="flex flex-col gap-3">
        {commentsQuery.isLoading && <p className="text-gray-400">読み込み中…</p>}
        {commentsQuery.isError && (
          <p className="text-red-600">
            {commentsQuery.error instanceof ApiRequestError
              ? commentsQuery.error.message
              : "読み込みに失敗しました"}
          </p>
        )}
        {commentsQuery.data?.length === 0 && (
          <p className="text-sm text-gray-400">まだコメントはありません。</p>
        )}
        {commentsQuery.data?.map((comment) => (
          <div
            key={comment.id}
            className="flex flex-col gap-1 rounded-lg border border-gray-200 p-3"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium">{comment.author.name}</span>
              <span className="text-xs text-gray-400">
                {new Date(comment.createdAt).toLocaleString("ja-JP")}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-gray-900">
              {comment.body}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="コメントを追加…"
          rows={3}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="self-end rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {mutation.isPending ? "投稿中…" : "コメント"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export function TicketDetailPage() {
  const { projectId, ticketId } = useParams({ strict: false });
  const { data: session, isPending } = authClient.useSession();
  const queryClient = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => getTicket(ticketId!),
    enabled: !!session && !!ticketId,
  });

  const membersQuery = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => listMembers(projectId!),
    enabled: !!session && !!projectId,
  });

  const mutation = useMutation({
    mutationFn: (input: UpdateTicketInput) => updateTicket(ticketId!, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<TicketDetail>(["ticket", ticketId], updated);
      // The list shows status/priority/assignee, so refresh it too.
      queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
    },
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
        to="/projects/$projectId/tickets"
        params={{ projectId: projectId! }}
        className="text-sm text-gray-500 hover:underline"
      >
        ← チケット一覧
      </Link>

      {ticketQuery.isLoading && <p className="text-gray-400">読み込み中…</p>}
      {ticketQuery.isError && (
        <p className="text-red-600">
          {ticketQuery.error instanceof ApiRequestError
            ? ticketQuery.error.message
            : "読み込みに失敗しました"}
        </p>
      )}

      {ticketQuery.data && (
        <article className="flex flex-col gap-6">
          <header className="flex flex-col gap-1">
            <span className="font-mono text-xs text-gray-500">
              {ticketQuery.data.key}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">
              {ticketQuery.data.title}
            </h1>
          </header>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-4">
            <Field label="ステータス">
              <select
                value={ticketQuery.data.status}
                disabled={mutation.isPending}
                onChange={(e) =>
                  mutation.mutate({
                    status: e.target.value as TicketDetail["status"],
                  })
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="種別">{TYPE_LABELS[ticketQuery.data.type]}</Field>
            <Field label="優先度">
              <select
                value={ticketQuery.data.priority}
                disabled={mutation.isPending}
                onChange={(e) =>
                  mutation.mutate({
                    priority: e.target.value as TicketDetail["priority"],
                  })
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="担当者">
              <select
                value={ticketQuery.data.assigneeId ?? ""}
                disabled={mutation.isPending || membersQuery.isLoading}
                onChange={(e) =>
                  mutation.mutate({ assigneeId: e.target.value || null })
                }
                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
              >
                <option value="">未割り当て</option>
                {membersQuery.data?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="報告者">{ticketQuery.data.reporter.name}</Field>
          </dl>
          {mutation.isError && (
            <p className="text-sm text-red-600">
              {mutation.error instanceof ApiRequestError
                ? mutation.error.message
                : "更新に失敗しました"}
            </p>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-gray-500">説明</h2>
            {ticketQuery.data.description ? (
              <p className="whitespace-pre-wrap text-sm text-gray-900">
                {ticketQuery.data.description}
              </p>
            ) : (
              <p className="text-sm text-gray-400">説明はありません。</p>
            )}
          </section>

          <CommentsSection ticketId={ticketQuery.data.id} />
        </article>
      )}
    </main>
  );
}
