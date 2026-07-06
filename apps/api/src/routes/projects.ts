import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb, newId, projects } from "@tasklog/db";
import { createProjectSchema, type Project } from "@tasklog/shared";
import type { AppEnv } from "../types";
import { canManageProjects, getMembership } from "../lib/authz";

// Mounted under /api/workspaces/:workspaceId/projects (see routes/workspaces.ts).
export const projectsRoute = new Hono<AppEnv>();

type ProjectRow = {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  workspaceId: r.workspaceId,
  name: r.name,
  key: r.key,
  description: r.description,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

// List projects in a workspace (any member).
const WORKSPACE_NOT_FOUND = {
  error: { code: "WORKSPACE_NOT_FOUND", message: "Workspace not found" },
} as const;

projectsRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");
  if (!workspaceId) return c.json(WORKSPACE_NOT_FOUND, 404);

  const membership = await getMembership(db, workspaceId, user.id);
  if (!membership) return c.json(WORKSPACE_NOT_FOUND, 404);

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  return c.json({ data: rows.map(toProject) });
});

// Create a project (OWNER/ADMIN only).
projectsRoute.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const workspaceId = c.req.param("workspaceId");
  if (!workspaceId) return c.json(WORKSPACE_NOT_FOUND, 404);

  const membership = await getMembership(db, workspaceId, user.id);
  if (!membership) return c.json(WORKSPACE_NOT_FOUND, 404);
  if (!canManageProjects(membership.role)) {
    return c.json(
      {
        error: {
          code: "FORBIDDEN",
          message: "プロジェクトを作成する権限がありません",
        },
      },
      403,
    );
  }

  const body = await c.req.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
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
  try {
    await db.insert(projects).values({
      id,
      workspaceId,
      name: parsed.data.name,
      key: parsed.data.key,
      description: parsed.data.description ?? null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (e) {
    // (workspace_id, key) is unique.
    if (e instanceof Error && /UNIQUE constraint failed/.test(e.message)) {
      return c.json(
        {
          error: {
            code: "PROJECT_KEY_TAKEN",
            message: `キー「${parsed.data.key}」は既に使われています`,
          },
        },
        409,
      );
    }
    throw e;
  }

  const data = toProject({
    id,
    workspaceId,
    name: parsed.data.name,
    key: parsed.data.key,
    description: parsed.data.description ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return c.json({ data }, 201);
});
