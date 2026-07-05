import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  createDb,
  newId,
  users,
  sessions,
  accounts,
  verifications,
} from "@tasklog/db";

// Better Auth reads secrets and the D1 binding from `env`, which on Cloudflare
// Workers is only available per-request. So the auth instance is built per
// request rather than as a module-level singleton.
export function createAuth(env: Env) {
  const db = createDb(env.DB);

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      // Map Better Auth's model names to our plural Drizzle tables.
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications,
      },
    }),
    // Use UUIDv7 for all Better Auth-generated ids to match domain tables.
    advanced: {
      database: {
        generateId: () => newId(),
      },
    },
    // Google is the only enabled provider (see docs/decisions.md).
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
