import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb, newId, workspaceMembers, workspaces } from "@tasklog/db";
import { createWorkspaceSchema, type Workspace } from "@tasklog/shared";
import type { AppEnv } from "../types";
import { requireAuth } from "../middleware/auth";

export const workspacesRoute = new Hono<AppEnv>();

workspacesRoute.use("*", requireAuth);

// List workspaces the current user is a member of, with their role.
workspacesRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      ownerId: workspaces.ownerId,
      role: workspaceMembers.role,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, user.id));

  const data: Workspace[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    ownerId: r.ownerId,
    role: r.role,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return c.json({ data });
});

// Create a workspace; the creator becomes its OWNER member.
workspacesRoute.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createWorkspaceSchema.safeParse(body);
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

  const db = createDb(c.env.DB);
  const user = c.get("user");
  const workspaceId = newId();
  const now = new Date();

  // D1 has no interactive transactions; batch keeps the two inserts atomic.
  await db.batch([
    db.insert(workspaces).values({
      id: workspaceId,
      name: parsed.data.name,
      ownerId: user.id,
      createdAt: now,
      updatedAt: now,
    }),
    db.insert(workspaceMembers).values({
      workspaceId,
      userId: user.id,
      role: "OWNER",
    }),
  ]);

  const data: Workspace = {
    id: workspaceId,
    name: parsed.data.name,
    ownerId: user.id,
    role: "OWNER",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  return c.json({ data }, 201);
});
