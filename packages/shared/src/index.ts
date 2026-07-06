import { z } from "zod";

// Fixed issue enums (see AGENTS.md). SQLite has no enum type, so these are the
// single source of truth used for Zod validation and Drizzle text unions.
export const ISSUE_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CLOSED",
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_TYPES = ["TASK", "BUG", "FEATURE", "IMPROVEMENT"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const WORKSPACE_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

// Standard API envelope (see AGENTS.md "API Design").
export type ApiSuccess<T> = { data: T };
export type ApiError = { error: { code: string; message: string } };

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  db: z.enum(["ok", "error"]),
  time: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

// --- Workspaces ----------------------------------------------------------------

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "ワークスペース名は必須です").max(100),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

// A workspace as returned by the API, including the caller's role in it.
// Timestamps are ISO strings (JSON-serialized Dates).
export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
};
