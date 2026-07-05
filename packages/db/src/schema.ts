import { text } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

// Real tables (users, workspaces, projects, issues, ...) are added in the next
// step. This file is the single source of truth for the D1/SQLite schema.
//
// Convention: primary keys are UUIDv7 stored as text, generated in the Worker
// before insert (see AGENTS.md / docs/decisions.md). UUIDv7 is time-ordered,
// which keeps the SQLite index locality good and makes ids sortable by creation.
export const idColumn = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());
