import { drizzle } from "drizzle-orm/d1";
import { uuidv7 } from "uuidv7";
import * as schema from "./schema";

export * from "./schema";

// Time-ordered UUIDv7, used for all primary keys (see docs/decisions.md).
export const newId = () => uuidv7();

// Create a Drizzle client bound to a Cloudflare D1 database.
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof createDb>;
