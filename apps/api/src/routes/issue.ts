import { Hono } from "hono";
import { inArray } from "drizzle-orm";
import { createDb, users } from "@tasklog/db";
import type { IssueDetail, UserSummary } from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getIssueAccess } from "../lib/authz";
import { toIssue } from "./issues";

// Mounted under /api/issues/:issueId (see index.ts).
export const issueRoute = new Hono<AppEnv>();

const ISSUE_NOT_FOUND = {
  error: { code: "ISSUE_NOT_FOUND", message: "Issue not found" },
} as const;

// Get a single issue with its reporter/assignee resolved (any workspace member).
issueRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const issueId = c.req.param("issueId");
  if (!issueId) return c.json(ISSUE_NOT_FOUND, 404);

  const access = await getIssueAccess(db, issueId, user.id);
  if (!access) return c.json(ISSUE_NOT_FOUND, 404);

  const { issue, projectKey } = access;
  const ids = [issue.reporterId];
  if (issue.assigneeId) ids.push(issue.assigneeId);

  const rows = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(inArray(users.id, ids));
  const byId = new Map<string, UserSummary>(rows.map((r) => [r.id, r]));

  const reporter = byId.get(issue.reporterId);
  if (!reporter) return c.json(ISSUE_NOT_FOUND, 404); // reporter is notNull FK
  const assignee = issue.assigneeId ? (byId.get(issue.assigneeId) ?? null) : null;

  const data: IssueDetail = { ...toIssue(issue, projectKey), reporter, assignee };
  return c.json({ data });
});
