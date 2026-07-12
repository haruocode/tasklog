import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
  createTicketSchema,
  type TicketFilters,
  type TicketPriority,
  type TicketType,
} from "@tasklog/shared";
import { authClient } from "../lib/auth-client";
import { ApiRequestError, createTicket, listTickets, listMembers } from "../lib/api";
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS } from "../lib/ticket-labels";

function CreateTicketForm({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("TASK");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: { title: string; type: TicketType; priority: TicketPriority }) =>
      createTicket(projectId, input),
    onSuccess: () => {
      setTitle("");
      setType("TASK");
      setPriority("MEDIUM");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "作成に失敗しました"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createTicketSchema.safeParse({ title, type, priority });
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
          placeholder="チケットのタイトル"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TicketType)}
          className="rounded-md border border-gray-300 px-2 py-2 text-sm"
        >
          {TICKET_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TicketPriority)}
          className="rounded-md border border-gray-300 px-2 py-2 text-sm"
        >
          {TICKET_PRIORITIES.map((p) => (
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

export function TicketsPage() {
  const { projectId } = useParams({ strict: false });
  const { data: session, isPending } = authClient.useSession();

  const [status, setStatus] = useState<TicketFilters["status"] | "">(ALL);
  const [priority, setPriority] = useState<TicketFilters["priority"] | "">(ALL);
  const [type, setType] = useState<TicketFilters["type"] | "">(ALL);
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

  const filters: TicketFilters = {
    status: status || undefined,
    priority: priority || undefined,
    type: type || undefined,
    assigneeId: assigneeId || undefined,
    q: debouncedKeyword || undefined,
  };

  const ticketsQuery = useQuery({
    queryKey: ["tickets", projectId, filters],
    queryFn: () => listTickets(projectId!, filters),
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
        <h1 className="text-2xl font-bold tracking-tight">チケット</h1>
        <Link to="/workspaces" className="text-sm text-gray-500 hover:underline">
          ワークスペース一覧
        </Link>
      </div>

      <CreateTicketForm projectId={projectId!} />

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
          {TICKET_STATUSES.map((s) => (
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
          {TICKET_PRIORITIES.map((p) => (
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
          {TICKET_TYPES.map((t) => (
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
        {ticketsQuery.isLoading && <p className="text-gray-400">読み込み中…</p>}
        {ticketsQuery.isError && (
          <p className="text-red-600">
            {ticketsQuery.error instanceof ApiRequestError
              ? ticketsQuery.error.message
              : "読み込みに失敗しました"}
          </p>
        )}
        {ticketsQuery.data?.length === 0 && (
          <p className="text-sm text-gray-500">
            {status || priority || type || assigneeId || debouncedKeyword
              ? "条件に一致するチケットがありません。"
              : "まだチケットがありません。上のフォームから作成してください。"}
          </p>
        )}
        {ticketsQuery.data && ticketsQuery.data.length > 0 && (
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
              {ticketsQuery.data.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-mono text-xs">
                    <Link
                      to="/projects/$projectId/tickets/$ticketId"
                      params={{ projectId: projectId!, ticketId: ticket.id }}
                      className="text-blue-600 hover:underline"
                    >
                      {ticket.key}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 font-medium">{ticket.title}</td>
                  <td className="py-2 pr-3 text-gray-600">
                    {TYPE_LABELS[ticket.type]}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {PRIORITY_LABELS[ticket.priority]}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    {ticket.assigneeId ? (
                      (memberName.get(ticket.assigneeId) ?? "—")
                    ) : (
                      <span className="text-gray-400">未割り当て</span>
                    )}
                  </td>
                  <td className="py-2 text-gray-600">
                    {STATUS_LABELS[ticket.status]}
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
