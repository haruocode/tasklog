import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import { createDb, ticketComments, newId, users } from "@tasklog/db";
import { createCommentSchema, type Comment } from "@tasklog/shared";
import type { AppEnv } from "../types";
import { getTicketAccess } from "../lib/authz";

// Mounted under /api/tickets/:ticketId/comments (see index.ts).
export const commentsRoute = new Hono<AppEnv>();

const TICKET_NOT_FOUND = {
  error: { code: "TICKET_NOT_FOUND", message: "Ticket not found" },
} as const;

// List a ticket's comments, oldest first (any workspace member).
commentsRoute.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const ticketId = c.req.param("ticketId");
  if (!ticketId) return c.json(TICKET_NOT_FOUND, 404);

  const access = await getTicketAccess(db, ticketId, user.id);
  if (!access) return c.json(TICKET_NOT_FOUND, 404);

  const rows = await db
    .select({
      id: ticketComments.id,
      body: ticketComments.body,
      createdAt: ticketComments.createdAt,
      updatedAt: ticketComments.updatedAt,
      authorId: users.id,
      authorName: users.name,
      authorImage: users.image,
    })
    .from(ticketComments)
    .innerJoin(users, eq(users.id, ticketComments.userId))
    .where(eq(ticketComments.ticketId, ticketId))
    .orderBy(asc(ticketComments.createdAt));

  const data: Comment[] = rows.map((r) => ({
    id: r.id,
    ticketId,
    body: r.body,
    author: { id: r.authorId, name: r.authorName, image: r.authorImage },
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
  return c.json({ data });
});

// Add a comment to a ticket (any workspace member).
commentsRoute.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const user = c.get("user");
  const ticketId = c.req.param("ticketId");
  if (!ticketId) return c.json(TICKET_NOT_FOUND, 404);

  const access = await getTicketAccess(db, ticketId, user.id);
  if (!access) return c.json(TICKET_NOT_FOUND, 404);

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
  await db.insert(ticketComments).values({
    id,
    ticketId,
    userId: user.id,
    body: parsed.data.body,
    createdAt: now,
    updatedAt: now,
  });

  const data: Comment = {
    id,
    ticketId,
    body: parsed.data.body,
    author: { id: user.id, name: user.name, image: user.image ?? null },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  return c.json({ data }, 201);
});
