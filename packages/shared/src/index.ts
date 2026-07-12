import { z } from "zod";

// Fixed ticket enums (see AGENTS.md). SQLite has no enum type, so these are the
// single source of truth used for Zod validation and Drizzle text unions.
export const TICKET_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CLOSED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_TYPES = ["TASK", "BUG", "FEATURE", "IMPROVEMENT"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

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
// Used to build ticket keys like TASK-1.
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

// --- Tickets --------------------------------------------------------------------

// New tickets always start as TODO; status is changed later via PATCH, so it is
// not part of the create input (see AGENTS.md workflow).
export const createTicketSchema = z.object({
  title: z.string().trim().min(1, "タイトルは必須です").max(200),
  description: z.string().trim().max(5000).optional(),
  type: z.enum(TICKET_TYPES).default("TASK"),
  priority: z.enum(TICKET_PRIORITIES).default("MEDIUM"),
  assigneeId: z.string().min(1).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

// Filters for listing tickets. All optional; omitted fields are not constrained.
// `q` is a keyword matched against the ticket title.
export type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  assigneeId?: string;
  q?: string;
};

// Partial update of an editable ticket. All fields optional; at least one
// required. `description` accepts null to clear it.
export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(1, "タイトルは必須です").max(200),
    description: z.string().trim().max(5000).nullable(),
    type: z.enum(TICKET_TYPES),
    status: z.enum(TICKET_STATUSES),
    priority: z.enum(TICKET_PRIORITIES),
    // null clears the assignee; a string must be a member of the workspace
    // (enforced by the API).
    assigneeId: z.string().min(1).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "変更する項目がありません",
  });
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

// An ticket as returned by the API. `key` is the display key (projects.key +
// "-" + ticketNumber, e.g. "TASK-1"). Timestamps are ISO strings.
export type Ticket = {
  id: string;
  projectId: string;
  ticketNumber: number;
  key: string;
  title: string;
  description: string | null;
  type: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
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

// A single ticket with its reporter/assignee resolved to user summaries.
export type TicketDetail = Ticket & {
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
  ticketId: string;
  body: string;
  author: UserSummary;
  createdAt: string;
  updatedAt: string;
};
