import { Hono } from "hono";
import { and, desc, eq, like, max, type SQL } from "drizzle-orm";
import { createDb, tickets, newId } from "@tasklog/db";
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
  createTicketSchema,
  type Ticket,
} from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getProjectAccess } from "../lib/authz";

// Returns `value` if it is one of `allowed`, else undefined. Used to ignore
// unknown filter query params instead of erroring.
function oneOf<T extends string>(
  allowed: readonly T[],
  value: string | undefined,
): T | undefined {
  return value && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

// Mounted under /api/projects/:projectId/tickets (see index.ts).
export const ticketsRoute = new Hono<AppEnv>();

const PROJECT_NOT_FOUND = {
  error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
} as const;

type TicketRow = typeof tickets.$inferSelect;

export const toTicket = (r: TicketRow, projectKey: string): Ticket => ({
  id: r.id,
  projectId: r.projectId,
  ticketNumber: r.ticketNumber,
  key: `${projectKey}-${r.ticketNumber}`,
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

// List tickets in a project (any workspace member), newest first.
ticketsRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!projectId) return c.json(PROJECT_NOT_FOUND, 404);

  const access = await getProjectAccess(db, projectId, user.id);
  if (!access) return c.json(PROJECT_NOT_FOUND, 404);

  // Optional filters; unknown enum values are ignored (see oneOf).
  const conditions: SQL[] = [eq(tickets.projectId, projectId)];
  const status = oneOf(TICKET_STATUSES, c.req.query("status"));
  if (status) conditions.push(eq(tickets.status, status));
  const priority = oneOf(TICKET_PRIORITIES, c.req.query("priority"));
  if (priority) conditions.push(eq(tickets.priority, priority));
  const type = oneOf(TICKET_TYPES, c.req.query("type"));
  if (type) conditions.push(eq(tickets.type, type));
  const assigneeId = c.req.query("assigneeId")?.trim();
  if (assigneeId) conditions.push(eq(tickets.assigneeId, assigneeId));
  const q = c.req.query("q")?.trim();
  if (q) conditions.push(like(tickets.title, `%${q}%`));

  const rows = await db
    .select()
    .from(tickets)
    .where(and(...conditions))
    .orderBy(desc(tickets.ticketNumber));

  return c.json({ data: rows.map((r) => toTicket(r, access.project.key)) });
});

// Create a ticket (any workspace member). Starts as TODO.
ticketsRoute.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const projectId = c.req.param("projectId");
  if (!projectId) return c.json(PROJECT_NOT_FOUND, 404);

  const access = await getProjectAccess(db, projectId, user.id);
  if (!access) return c.json(PROJECT_NOT_FOUND, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);
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

  // ticket_number is sequential per project. D1 has no interactive transactions,
  // so a concurrent create can collide on the (project_id, ticket_number) unique
  // index; retry a few times by recomputing MAX+1.
  const now = new Date();
  for (let attempt = 0; attempt < 3; attempt++) {
    const [{ value: maxNumber } = { value: null }] = await db
      .select({ value: max(tickets.ticketNumber) })
      .from(tickets)
      .where(eq(tickets.projectId, projectId));
    const ticketNumber = (maxNumber ?? 0) + 1;

    const row: TicketRow = {
      id: newId(),
      projectId,
      ticketNumber,
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
      await db.insert(tickets).values(row);
    } catch (e) {
      if (e instanceof Error && /UNIQUE constraint failed/.test(e.message)) {
        continue;
      }
      throw e;
    }

    return c.json({ data: toTicket(row, access.project.key) }, 201);
  }

  return c.json(
    {
      error: {
        code: "TICKET_NUMBER_CONFLICT",
        message: "採番に失敗しました。もう一度お試しください",
      },
    },
    409,
  );
});
