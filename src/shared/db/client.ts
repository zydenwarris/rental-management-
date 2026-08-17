import postgres, { type Sql } from "postgres";
import { env, hasDatabase } from "../../config/env.js";

/**
 * The postgres.js client, created once and lazily.
 *
 * `prepare: false` is mandatory, not a preference: DATABASE_URL points at Supabase's
 * transaction pooler (Supavisor, port 6543), which hands a different backend to each
 * transaction. Named prepared statements do not survive that, and the driver would fail
 * with "prepared statement already exists" under any real concurrency.
 */

const MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT_SECONDS = 20;
const CONNECT_TIMEOUT_SECONDS = 10;

let client: Sql | null = null;

export function getSql(): Sql {
  if (!hasDatabase) {
    // A bug, not a user error: something asked for the database in a configuration
    // that deliberately has none.
    throw new Error("DATABASE_URL is not set — no database is configured.");
  }

  client ??= postgres(env.DATABASE_URL as string, {
    prepare: false,
    ssl: "require",
    max: MAX_CONNECTIONS,
    idle_timeout: IDLE_TIMEOUT_SECONDS,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
  });

  return client;
}

/** Closes the pool. For test teardown and graceful shutdown; a no-op if never opened. */
export async function closeDatabase(): Promise<void> {
  if (client === null) return;
  const closing = client;
  client = null;
  await closing.end();
}
