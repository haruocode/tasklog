import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { createDb, issueComments, newId, users } from "@tasklog/db";
import { createCommentSchema, type Comment } from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getIssueAccess } from "../lib/authz";

// Mounted under /api/issues/:issueId/comments (see index.ts).
export const commentsRoute = new Hono<AppEnv>();

const ISSUE_NOT_FOUND = {
  error: { code: "ISSUE_NOT_FOUND", message: "Issue not found" },
} as const;

// List an issue's comments, oldest first (any workspace member).
commentsRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const issueId = c.req.param("issueId");
  if (!issueId) return c.json(ISSUE_NOT_FOUND, 404);

  const access = await getIssueAccess(db, issueId, user.id);
  if (!access) return c.json(ISSUE_NOT_FOUND, 404);

  const rows = await db
    .select({
      id: issueComments.id,
      body: issueComments.body,
      createdAt: issueComments.createdAt,
      updatedAt: issueComments.updatedAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(issueComments)
    .innerJoin(users, eq(users.id, issueComments.userId))
    .where(eq(issueComments.issueId, issueId))
    .orderBy(asc(issueComments.createdAt));

  const data: Comment[] = rows.map((r) => ({
    id: r.id,
    issueId,
    body: r.body,
    author: { id: r.authorId, name: r.authorName, image: r.authorImage },
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return c.json({ data });
});

// Add a comment to an issue (any workspace member).
commentsRoute.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const issueId = c.req.param("issueId");
  if (!issueId) return c.json(ISSUE_NOT_FOUND, 404);

  const access = await getIssueAccess(db, issueId, user.id);
  if (!access) return c.json(ISSUE_NOT_FOUND, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = createCommentSchema.safeParse(body);
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

  const id = newId();
  const now = new Date();
  await db.insert(issueComments).values({
    id,
    issueId,
    userId: user.id,
    body: parsed.data.body,
    createdAt: now,
    updatedAt: now,
  });

  const data: Comment = {
    id,
    issueId,
    body: parsed.data.body,
    author: { id: user.id, name: user.name, image: user.image ?? null },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  return c.json({ data }, 201);
});
