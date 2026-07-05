import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPES,
  WORKSPACE_ROLES,
} from "@tasklog/shared";

// This file is the single source of truth for the D1/SQLite schema.
//
// Conventions (see AGENTS.md / docs/decisions.md):
// - Primary keys are UUIDv7 stored as text, generated in the Worker before
//   insert. UUIDv7 is time-ordered, which keeps SQLite index locality good.
// - Fixed enums (status/type/priority/role) come from @tasklog/shared and are
//   stored as text with a CHECK-like `enum` constraint.
// - Timestamps are stored as integer unix seconds via Drizzle `timestamp` mode.

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

// `users` is the canonical user table AND Better Auth's `user` model (mapped via
// the drizzle adapter). Fields follow Better Auth's required user schema
// (emailVerified, image); domain FKs below reference this table.
export const users = sqliteTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// --- Better Auth tables (mapped as session/account/verification) ---------------
// Column set matches Better Auth's required core schema.

export const sessions = sqliteTable("sessions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = sqliteTable("accounts", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verifications = sqliteTable("verifications", {
  id: id(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workspaces = sqliteTable("workspaces", {
  id: id(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: WORKSPACE_ROLES }).notNull().default("MEMBER"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("workspace_members_ws_user_uq").on(t.workspaceId, t.userId)],
);

export const projects = sqliteTable(
  "projects",
  {
    id: id(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Uppercase alphanumeric, used to build display keys like TASK-1.
    key: text("key").notNull(),
    description: text("description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("projects_ws_key_uq").on(t.workspaceId, t.key)],
);

export const issues = sqliteTable(
  "issues",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Sequential per project; combined with projects.key -> "TASK-1".
    issueNumber: integer("issue_number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type", { enum: ISSUE_TYPES }).notNull().default("TASK"),
    status: text("status", { enum: ISSUE_STATUSES }).notNull().default("TODO"),
    priority: text("priority", { enum: ISSUE_PRIORITIES })
      .notNull()
      .default("MEDIUM"),
    assigneeId: text("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dueDate: integer("due_date", { mode: "timestamp" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("issues_project_number_uq").on(t.projectId, t.issueNumber),
    index("issues_project_status_idx").on(t.projectId, t.status),
    index("issues_assignee_idx").on(t.assigneeId),
  ],
);

export const issueComments = sqliteTable(
  "issue_comments",
  {
    id: id(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("issue_comments_issue_idx").on(t.issueId)],
);

export const issueActivities = sqliteTable(
  "issue_activities",
  {
    id: id(),
    issueId: text("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    // e.g. "issue.created", "status.changed", "assignee.changed"
    action: text("action").notNull(),
    beforeValue: text("before_value"),
    afterValue: text("after_value"),
    createdAt: createdAt(),
  },
  (t) => [index("issue_activities_issue_idx").on(t.issueId)],
);
