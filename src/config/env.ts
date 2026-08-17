import "dotenv/config";
import { z } from "zod";
import { DEFAULT_PORT } from "./constants.js";

/**
 * The one place process.env is read.
 *
 * Parsing happens once at import time so a malformed value crashes at boot, next to
 * the .env file that caused it, rather than at the first query hours later. Everything
 * downstream reads a typed, frozen object and never touches process.env again.
 */

const envSchema = z.object({
  /**
   * Supabase transaction pooler (port 6543), NOT the direct connection on 5432.
   * Unset means "run entirely on the in-memory repositories", which is what keeps
   * every step of the database migration shippable on its own.
   */
  DATABASE_URL: z.string().url().optional(),

  /** Project URL. Used to build the JWKS endpoint and as the expected `iss` claim. */
  SUPABASE_URL: z.string().url(),

  /**
   * Temporary scaffold: false lets requests without an Authorization header fall back
   * to the development landlord, so the API stays usable while the frontend is being
   * wired up. Removed once the portal sends real tokens.
   */
  AUTH_REQUIRED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  PORT: z.coerce.number().int().positive().default(DEFAULT_PORT),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    // Crash early and loudly: a misconfigured environment is not something the app
    // can meaningfully continue past.
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  return Object.freeze(result.data);
}

export const env = loadEnv();

/** True when a real database is configured; false means the in-memory repositories. */
export const hasDatabase = env.DATABASE_URL !== undefined;
