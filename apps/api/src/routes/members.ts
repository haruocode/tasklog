import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { createDb, users, workspaceMembers } from "@tasklog/db";
import type { Member } from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getProjectAccess } from "../lib/authz";

// Mounted under /api/projects/:projectId/members (see index.ts). Lists the
// members of the workspace that owns the project — the assignee candidates.
export const membersRoute = new Hono<AppEnv>();

const PROJECT_NOT_FOUND = {
  error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
} as const;

membersRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!projectId) return c.json(PROJECT_NOT_FOUND, 404);

  const access = await getProjectAccess(db, projectId, user.id);
  if (!access) return c.json(PROJECT_NOT_FOUND, 404);

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, access.project.workspaceId))
    .orderBy(asc(users.name));

  const data: Member[] = rows;
  return c.json({ data });
});
