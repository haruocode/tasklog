import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import { createDb, issues, users, type Db } from "@tasklog/db";
import {
  updateIssueSchema,
  type IssueDetail,
  type UserSummary,
} from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getIssueAccess } from "../lib/authz";
import { toIssue } from "./issues";

// Mounted under /api/issues/:issueId (see index.ts).
export const issueRoute = new Hono<AppEnv>();

const ISSUE_NOT_FOUND = {
  error: { code: "ISSUE_NOT_FOUND", message: "Issue not found" },
} as const;

type IssueRow = typeof issues.$inferSelect;

// Resolves an issue row's reporter/assignee into a full IssueDetail. Returns
// undefined only if the reporter (a notNull FK) is somehow missing.
async function buildDetail(
  db: Db,
  issue: IssueRow,
  projectKey: string,
): Promise<IssueDetail | undefined> {
  const ids = [issue.reporterId];
  if (issue.assigneeId) ids.push(issue.assigneeId);

  const rows = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(inArray(users.id, ids));
  const byId = new Map<string, UserSummary>(rows.map((r) => [r.id, r]));

  const reporter = byId.get(issue.reporterId);
  if (!reporter) return undefined;
  const assignee = issue.assigneeId ? (byId.get(issue.assigneeId) ?? null) : null;

  return { ...toIssue(issue, projectKey), reporter, assignee };
}

// Get a single issue with its reporter/assignee resolved (any workspace member).
issueRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const issueId = c.req.param("issueId");
  if (!issueId) return c.json(ISSUE_NOT_FOUND, 404);

  const access = await getIssueAccess(db, issueId, user.id);
  if (!access) return c.json(ISSUE_NOT_FOUND, 404);

  const detail = await buildDetail(db, access.issue, access.projectKey);
  if (!detail) return c.json(ISSUE_NOT_FOUND, 404);
  return c.json({ data: detail });
});

// Update an issue's editable fields (any workspace member).
issueRoute.patch("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const issueId = c.req.param("issueId");
  if (!issueId) return c.json(ISSUE_NOT_FOUND, 404);

  const access = await getIssueAccess(db, issueId, user.id);
  if (!access) return c.json(ISSUE_NOT_FOUND, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateIssueSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
      },
      400,
    );
  }

  // updatedAt is bumped automatically via the schema's $onUpdate.
  const [updated] = await db
    .update(issues)
    .set(parsed.data)
    .where(eq(issues.id, issueId))
    .returning();
  if (!updated) return c.json(ISSUE_NOT_FOUND, 404);

  const detail = await buildDetail(db, updated, access.projectKey);
  if (!detail) return c.json(ISSUE_NOT_FOUND, 404);
  return c.json({ data: detail });
});
