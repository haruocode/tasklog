import { Hono } from "hono";
import { desc, eq, max } from "drizzle-orm";
import { createDb, issues, newId } from "@tasklog/db";
import { createIssueSchema, type Issue } from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getProjectAccess } from "../lib/authz";

// Mounted under /api/projects/:projectId/issues (see index.ts).
export const issuesRoute = new Hono<AppEnv>();

const PROJECT_NOT_FOUND = {
  error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
} as const;

type IssueRow = typeof issues.$inferSelect;

export const toIssue = (r: IssueRow, projectKey: string): Issue => ({
  id: r.id,
  projectId: r.projectId,
  issueNumber: r.issueNumber,
  key: `${projectKey}-${r.issueNumber}`,
  title: r.title,
  description: r.description,
  type: r.type,
  status: r.status,
  priority: r.priority,
  assigneeId: r.assigneeId,
  reporterId: r.reporterId,
  dueDate: r.dueDate ? r.dueDate.toISOString() : null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

// List issues in a project (any workspace member), newest first.
issuesRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!projectId) return c.json(PROJECT_NOT_FOUND, 404);

  const access = await getProjectAccess(db, projectId, user.id);
  if (!access) return c.json(PROJECT_NOT_FOUND, 404);

  const rows = await db
    .select()
    .from(issues)
    .where(eq(issues.projectId, projectId))
    .orderBy(desc(issues.issueNumber));

  return c.json({ data: rows.map((r) => toIssue(r, access.project.key)) });
});

// Create an issue (any workspace member). Starts as TODO.
issuesRoute.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!projectId) return c.json(PROJECT_NOT_FOUND, 404);

  const access = await getProjectAccess(db, projectId, user.id);
  if (!access) return c.json(PROJECT_NOT_FOUND, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = createIssueSchema.safeParse(body);
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

  // issue_number is sequential per project. D1 has no interactive transactions,
  // so a concurrent create can collide on the (project_id, issue_number) unique
  // index; retry a few times by recomputing MAX+1.
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    const [{ value: maxNumber } = { value: null }] = await db
      .select({ value: max(issues.issueNumber) })
      .from(issues)
      .where(eq(issues.projectId, projectId));
    const issueNumber = (maxNumber ?? 0) + 1;

    const row: IssueRow = {
      id: newId(),
      projectId,
      issueNumber,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      status: "TODO",
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId ?? null,
      reporterId: user.id,
      dueDate: null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db.insert(issues).values(row);
    } catch (e) {
      if (e instanceof Error && /UNIQUE constraint failed/.test(e.message)) {
        continue;
      }
      throw e;
    }

    return c.json({ data: toIssue(row, access.project.key) }, 201);
  }

  return c.json(
    {
      error: {
        code: "ISSUE_NUMBER_CONFLICT",
        message: "採番に失敗しました。もう一度お試しください",
      },
    },
    409,
  );
});
