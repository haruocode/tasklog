import { createMiddleware } from "hono/factory";
import { createAuth } from "../auth";
import type { AppEnv } from "../types";

// Rejects unauthenticated requests with a stable 401 envelope and, on success,
// attaches the Better Auth user to the request context.
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      401,
    );
  }

  c.set("user", session.user);
  await next();
});
