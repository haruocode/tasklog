import { and, eq } from "drizzle-orm";
import { issues, projects, workspaceMembers, type Db } from "@tasklog/db";
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

export type ProjectAccess = {
  project: { id: string; workspaceId: string; key: string };
  role: WorkspaceRole;
};

// Resolves a project and the caller's membership in its workspace. Returns
// undefined when the project does not exist OR the caller is not a member;
// callers treat both as PROJECT_NOT_FOUND to avoid leaking project existence.
export async function getProjectAccess(
  db: Db,
  projectId: string,
  userId: string,
): Promise<ProjectAccess | undefined> {
  const [row] = await db
    .select({
      id: projects.id,
      workspaceId: projects.workspaceId,
      key: projects.key,
      role: workspaceMembers.role,
    })
    .from(projects)
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, projects.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!row) return undefined;
  return {
    project: { id: row.id, workspaceId: row.workspaceId, key: row.key },
    role: row.role,
  };
}

export type IssueAccess = {
  issue: typeof issues.$inferSelect;
  workspaceId: string;
  projectKey: string;
  role: WorkspaceRole;
};

// Resolves an issue, its project key, and the caller's membership role.
// Returns undefined when the issue does not exist OR the caller is not a member
// of its workspace; callers treat both as ISSUE_NOT_FOUND.
export async function getIssueAccess(
  db: Db,
  issueId: string,
  userId: string,
): Promise<IssueAccess | undefined> {
  const [row] = await db
    .select({
      issue: issues,
      workspaceId: projects.workspaceId,
      projectKey: projects.key,
      role: workspaceMembers.role,
    })
    .from(issues)
    .innerJoin(projects, eq(projects.id, issues.projectId))
    .innerJoin(
      workspaceMembers,
      and(
        eq(workspaceMembers.workspaceId, projects.workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .where(eq(issues.id, issueId))
    .limit(1);

  if (!row) return undefined;
  return {
    issue: row.issue,
    workspaceId: row.workspaceId,
    projectKey: row.projectKey,
    role: row.role,
  };
}
