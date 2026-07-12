import { Hono } from "hono";
import { eq, inArray } from "drizzle-orm";
import { createDb, tickets, users, type Db } from "@tasklog/db";
import {
  updateTicketSchema,
  type TicketDetail,
  type UserSummary,
} from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getTicketAccess, getMembership } from "../lib/authz";
import { toTicket } from "./tickets";

// Mounted under /api/tickets/:ticketId (see index.ts).
export const ticketRoute = new Hono<AppEnv>();

const TICKET_NOT_FOUND = {
  error: { code: "TICKET_NOT_FOUND", message: "Ticket not found" },
} as const;

type TicketRow = typeof tickets.$inferSelect;

// Resolves a ticket row's reporter/assignee into a full TicketDetail. Returns
// undefined only if the reporter (a notNull FK) is somehow missing.
async function buildDetail(
  db: Db,
  ticket: TicketRow,
  projectKey: string,
): Promise<TicketDetail | undefined> {
  const ids = [ticket.reporterId];
  if (ticket.assigneeId) ids.push(ticket.assigneeId);

  const rows = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(inArray(users.id, ids));
  const byId = new Map<string, UserSummary>(rows.map((r) => [r.id, r]));

  const reporter = byId.get(ticket.reporterId);
  if (!reporter) return undefined;
  const assignee = ticket.assigneeId ? (byId.get(ticket.assigneeId) ?? null) : null;

  return { ...toTicket(ticket, projectKey), reporter, assignee };
}

// Get a single ticket with its reporter/assignee resolved (any workspace member).
ticketRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const ticketId = c.req.param("ticketId");
  if (!ticketId) return c.json(TICKET_NOT_FOUND, 404);

  const access = await getTicketAccess(db, ticketId, user.id);
  if (!access) return c.json(TICKET_NOT_FOUND, 404);

  const detail = await buildDetail(db, access.ticket, access.projectKey);
  if (!detail) return c.json(TICKET_NOT_FOUND, 404);
  return c.json({ data: detail });
});

// Update a ticket's editable fields (any workspace member).
ticketRoute.patch("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const ticketId = c.req.param("ticketId");
  if (!ticketId) return c.json(TICKET_NOT_FOUND, 404);

  const access = await getTicketAccess(db, ticketId, user.id);
  if (!access) return c.json(TICKET_NOT_FOUND, 404);

  const body = await c.req.json().catch(() => null);
  const parsed = updateTicketSchema.safeParse(body);
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

  // A new assignee must be a member of the ticket's workspace.
  if (parsed.data.assigneeId) {
    const member = await getMembership(
      db,
      access.workspaceId,
      parsed.data.assigneeId,
    );
    if (!member) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "指定された担当者はこのワークスペースのメンバーではありません",
          },
        },
        400,
      );
    }
  }

  // updatedAt is bumped automatically via the schema's $onUpdate.
  const [updated] = await db
    .update(tickets)
    .set(parsed.data)
    .where(eq(tickets.id, ticketId))
    .returning();
  if (!updated) return c.json(TICKET_NOT_FOUND, 404);

  const detail = await buildDetail(db, updated, access.projectKey);
  if (!detail) return c.json(TICKET_NOT_FOUND, 404);
  return c.json({ data: detail });
});
