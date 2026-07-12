import type {
  ApiError,
  ApiSuccess,
  Comment,
  CreateCommentInput,
  CreateIssueInput,
  CreateProjectInput,
  CreateWorkspaceInput,
  Issue,
  IssueDetail,
  Project,
  UpdateIssueInput,
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

export const createProject = (workspaceId: string, input: CreateProjectInput) =>
  api<Project>(`/api/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const listIssues = (projectId: string) =>
  api<Issue[]>(`/api/projects/${projectId}/issues`);

export const createIssue = (projectId: string, input: CreateIssueInput) =>
  api<Issue>(`/api/projects/${projectId}/issues`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const getIssue = (issueId: string) =>
  api<IssueDetail>(`/api/issues/${issueId}`);

export const updateIssue = (issueId: string, input: UpdateIssueInput) =>
  api<IssueDetail>(`/api/issues/${issueId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const listComments = (issueId: string) =>
  api<Comment[]>(`/api/issues/${issueId}/comments`);

export const createComment = (issueId: string, input: CreateCommentInput) =>
  api<Comment>(`/api/issues/${issueId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
