import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { env } from "../../config/env.js";
import { ApiError } from "../errors.js";

/**
 * Verifies Supabase access tokens locally.
 *
 * The project signs with ES256 and publishes the public key at its JWKS endpoint, so
 * verification is a signature check against a cached key — no round-trip to Supabase per
 * request, and no shared secret sitting in .env. The service_role key is never involved:
 * this only ever reads a public key.
 *
 * createRemoteJWKSet fetches lazily and caches, and refetches on an unknown `kid`, which
 * is what makes Supabase's key rotation a non-event here.
 */

const AUTH_BASE_URL = `${env.SUPABASE_URL}/auth/v1`;
const AUDIENCE = "authenticated";

const jwks = createRemoteJWKSet(new URL(`${AUTH_BASE_URL}/.well-known/jwks.json`));

export interface AuthenticatedUser {
  /** The auth.users id. This is the landlord id — see the landlords table comment. */
  readonly id: string;
  readonly email: string;
  /** Collected at signup and stored in user_metadata; empty when not supplied. */
  readonly displayName: string;
}

export async function verifyAccessToken(token: string): Promise<AuthenticatedUser> {
  let payload: JWTPayload;

  try {
    ({ payload } = await jwtVerify(token, jwks, {
      issuer: AUTH_BASE_URL,
      audience: AUDIENCE,
    }));
  } catch {
    // Expired, tampered with, signed by another project, or simply not a JWT. The
    // caller gets one answer for all of them: a bad token is a bad token, and saying
    // which kind only helps someone probing.
    throw ApiError.unauthorized("Your session is invalid or has expired.");
  }

  if (typeof payload.sub !== "string" || payload.sub === "") {
    // A verified token with no subject is not something the app can act on.
    throw ApiError.unauthorized("Your session is invalid or has expired.");
  }

  return {
    id: payload.sub,
    email: readString(payload, "email"),
    displayName: readDisplayName(payload),
  };
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function readDisplayName(payload: JWTPayload): string {
  const metadata = payload["user_metadata"];
  if (typeof metadata !== "object" || metadata === null) return "";
  return readString(metadata as Record<string, unknown>, "display_name");
}
