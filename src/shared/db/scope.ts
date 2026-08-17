import type { TransactionSql } from "postgres";
import { getSql } from "./client.js";

/** The Postgres role Supabase's RLS policies are written against. */
const AUTHENTICATED_ROLE = "authenticated";

/**
 * Runs `fn` inside a transaction that the database sees as the given landlord.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The API connects as `postgres`, which owns these tables — and a table owner bypasses
 * row level security. Left alone, every policy in the schema would be decoration. The
 * preamble below switches the transaction to the `authenticated` role and supplies the
 * JWT claims that `auth.uid()` reads, so the policies actually run.
 *
 * That makes landlord isolation true twice over: repositories still scope by
 * `WHERE landlord_id = ...`, and the database independently refuses to return anyone
 * else's rows if a query ever forgets. Belt and braces on the one invariant whose
 * failure means showing a landlord another landlord's tenants.
 *
 * `set_config(..., true)` is transaction-local, so the settings die with the transaction
 * and cannot leak onto the next request that borrows the same pooled connection.
 */
export async function withLandlordScope<T>(
  landlordId: string,
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  const claims = JSON.stringify({ sub: landlordId, role: AUTHENTICATED_ROLE });

  return getSql().begin(async (tx) => {
    await tx`select set_config('role', ${AUTHENTICATED_ROLE}, true)`;
    await tx`select set_config('request.jwt.claims', ${claims}, true)`;
    return fn(tx);
  }) as Promise<T>;
}
