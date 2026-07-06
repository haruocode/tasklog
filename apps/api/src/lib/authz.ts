import { and, eq } from "drizzle-orm";
import { workspaceMembers, type Db } from "@tasklog/db";
import type { WorkspaceRole } from "@tasklog/shared";

export type Membership = { role: WorkspaceRole };

// Returns the caller's membership in a workspace, or undefined if not a member.
// Callers treat "not a member" as 404 to avoid leaking workspace existence.
export async function getMembership(
  db: Db,
  workspaceId: string,
  userId: string,
): Promise<Membership | undefined> {
  const [m] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return m;
}

// Roles allowed to manage projects (see AGENTS.md permissions).
export function canManageProjects(role: WorkspaceRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}
