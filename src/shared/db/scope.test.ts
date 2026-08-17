import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";

/**
 * Proves the RLS preamble in withLandlordScope actually takes effect, because the whole
 * defence-in-depth argument rests on it. Connecting as `postgres` — a table owner —
 * bypasses row level security, so if the role switch silently failed every policy in the
 * schema would be dead weight and nothing else would notice.
 *
 * Reads only, creates nothing: the tables here are empty until a real signup, and proving
 * one landlord cannot see another's rows needs two real auth.users rows. That proof lives
 * in the end-to-end verification, not here.
 *
 * dotenv is loaded explicitly rather than relying on the runner: this file must decide
 * whether to skip *before* importing anything that parses the environment.
 */
config();

const databaseUrl = process.env["DATABASE_URL"];
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("withLandlordScope", () => {
  const landlordId = "00000000-0000-4000-8000-000000000001";

  afterAll(async () => {
    const { closeDatabase } = await import("./client.js");
    await closeDatabase();
  });

  it("runs the transaction as the authenticated role, not the connection's owner role", async () => {
    const { withLandlordScope } = await import("./scope.js");

    const [row] = await withLandlordScope(landlordId, async (tx) => {
      return tx<{ role: string; claims: string | null }[]>`
        select current_user as role,
               current_setting('request.jwt.claims', true) as claims
      `;
    });

    expect(row?.role).toBe("authenticated");
    expect(JSON.parse(row?.claims ?? "{}")).toMatchObject({ sub: landlordId });
  });

  it("leaves no scope behind on the pooled connection", async () => {
    const { withLandlordScope } = await import("./scope.js");
    const { getSql } = await import("./client.js");

    await withLandlordScope(landlordId, async (tx) => tx`select 1`);

    // set_config(..., true) is transaction-local. If it ever leaked, the next request to
    // borrow this connection would inherit the previous landlord's identity.
    const [row] = await getSql()<{ role: string; claims: string | null }[]>`
      select current_user as role,
             current_setting('request.jwt.claims', true) as claims
    `;

    expect(row?.role).not.toBe("authenticated");
    expect(row?.claims ?? "").toBe("");
  });
});
