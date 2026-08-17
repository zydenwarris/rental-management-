import { withLandlordScope } from "../db/scope.js";
import type { AuthenticatedUser } from "./verifyToken.js";

/**
 * Makes sure the authenticated user has a landlords row, on their first request.
 *
 * Deliberately not a trigger on auth.users: a trigger that raises for any reason fails
 * signup with an opaque "Database error saving new user", in a place with no application
 * logs. Doing it here means failures land in the API's logs with a stack trace.
 *
 * The insert runs under the user's own RLS scope, so the API creates the row using the
 * landlords_insert policy rather than any elevated key.
 */

/**
 * Ids already written this process. The upsert is idempotent, so a stale cache can only
 * ever skip redundant work — never write the wrong row. Bounded by the number of distinct
 * users a single API process serves.
 */
const ensured = new Set<string>();

export async function ensureLandlord(user: AuthenticatedUser): Promise<void> {
  if (ensured.has(user.id)) return;

  await withLandlordScope(user.id, async (tx) => {
    await tx`
      insert into landlords (id, email, display_name)
      values (${user.id}, ${user.email}, ${user.displayName})
      on conflict (id) do update
        set email = excluded.email,
            -- A token without a display name must not blank out one already stored.
            display_name = case
              when excluded.display_name = '' then landlords.display_name
              else excluded.display_name
            end,
            updated_at = now()
    `;
  });

  ensured.add(user.id);
}

/** Test seam: forgets the cache so a fresh upsert is observable. */
export function resetEnsuredLandlords(): void {
  ensured.clear();
}
