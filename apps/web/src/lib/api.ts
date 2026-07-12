import type {
  ApiError,
  ApiSuccess,
  Comment,
  CreateCommentInput,
  CreateTicketInput,
  CreateProjectInput,
  CreateWorkspaceInput,
  Ticket,
  TicketDetail,
  TicketFilters,
  Member,
  Project,
  UpdateTicketInput,
  Workspace,
} from "@tasklog/shared";

export class ApiRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const e = (json as ApiError | null)?.error;
    throw new ApiRequestError(
      e?.code ?? "UNKNOWN",
      e?.message ?? "リクエストに失敗しました",
      res.status,
    );
  }
  return (json as ApiSuccess<T>).data;
}

export const listWorkspaces = () => api<Workspace[]>("/api/workspaces");

export const createWorkspace = (input: CreateWorkspaceInput) =>
  api<Workspace>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const listProjects = (workspaceId: string) =>
  api<Project[]>(`/api/workspaces/${workspaceId}/projects`);

export const listMembers = (projectId: string) =>
  api<Member[]>(`/api/projects/${projectId}/members`);

export const createProject = (workspaceId: string, input: CreateProjectInput) =>
  api<Project>(`/api/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const listTickets = (projectId: string, filters: TicketFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.type) params.set("type", filters.type);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return api<Ticket[]>(`/api/projects/${projectId}/tickets${qs ? `?${qs}` : ""}`);
};

export const createTicket = (projectId: string, input: CreateTicketInput) =>
  api<Ticket>(`/api/projects/${projectId}/tickets`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getTicket = (ticketId: string) =>
  api<TicketDetail>(`/api/tickets/${ticketId}`);

export const updateTicket = (ticketId: string, input: UpdateTicketInput) =>
  api<TicketDetail>(`/api/tickets/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const listComments = (ticketId: string) =>
  api<Comment[]>(`/api/tickets/${ticketId}/comments`);

export const createComment = (ticketId: string, input: CreateCommentInput) =>
  api<Comment>(`/api/tickets/${ticketId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
