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

// --- Projects ------------------------------------------------------------------

// Key must start with a letter, then uppercase letters/digits, 2–10 chars total.
// Used to build issue keys like TASK-1.
export const projectKeySchema = z
  .string()
  .trim()
  .regex(
    /^[A-Z][A-Z0-9]{1,9}$/,
    "キーは英大文字で始まる2〜10文字の英大文字・数字です",
  );

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "プロジェクト名は必須です").max(100),
  key: projectKeySchema,
  description: z.string().trim().max(500).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export type Project = {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

// --- Issues --------------------------------------------------------------------

// New issues always start as TODO; status is changed later via PATCH, so it is
// not part of the create input (see AGENTS.md workflow).
export const createIssueSchema = z.object({
  title: z.string().trim().min(1, "タイトルは必須です").max(200),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(ISSUE_TYPES).default("TASK"),
  priority: z.enum(ISSUE_PRIORITIES).default("MEDIUM"),
  assigneeId: z.string().min(1).optional(),
});
export type CreateIssueInput = z.infer<typeof createIssueSchema>;

// Filters for listing issues. All optional; omitted fields are not constrained.
// `q` is a keyword matched against the issue title.
export type IssueFilters = {
  status?: IssueStatus;
  priority?: IssuePriority;
  type?: IssueType;
  assigneeId?: string;
  q?: string;
};

// Partial update of an editable issue. All fields optional; at least one
// required. `description` accepts null to clear it.
export const updateIssueSchema = z
  .object({
    title: z.string().trim().min(1, "タイトルは必須です").max(200),
    description: z.string().trim().max(5000).nullable(),
    type: z.enum(ISSUE_TYPES),
    status: z.enum(ISSUE_STATUSES),
    priority: z.enum(ISSUE_PRIORITIES),
    // null clears the assignee; a string must be a member of the workspace
    // (enforced by the API).
    assigneeId: z.string().min(1).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "変更する項目がありません",
  });
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;

// An issue as returned by the API. `key` is the display key (projects.key +
// "-" + issueNumber, e.g. "TASK-1"). Timestamps are ISO strings.
export type Issue = {
  id: string;
  projectId: string;
  issueNumber: number;
  key: string;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

// Minimal user info embedded in responses (no email/private fields).
export type UserSummary = {
  id: string;
  name: string;
  image: string | null;
};

// A workspace member: a user plus their role in the workspace.
export type Member = UserSummary & { role: WorkspaceRole };

// A single issue with its reporter/assignee resolved to user summaries.
export type IssueDetail = Issue & {
  reporter: UserSummary;
  assignee: UserSummary | null;
};

// --- Comments ------------------------------------------------------------------

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "コメントを入力してください").max(5000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// A comment with its author resolved to a user summary.
export type Comment = {
  id: string;
  issueId: string;
  body: string;
  author: UserSummary;
  createdAt: string;
  updatedAt: string;
};
