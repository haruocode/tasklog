import { defineConfig } from "drizzle-kit";

// Generates SQL migrations from src/schema.ts into ./drizzle.
// Migrations are applied to D1 via wrangler (see apps/api scripts), which reads
// `migrations_dir` from apps/api/wrangler.jsonc.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema.ts",
  out: "./drizzle",
});
