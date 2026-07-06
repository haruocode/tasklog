import type {
  ApiError,
  ApiSuccess,
  CreateWorkspaceInput,
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
