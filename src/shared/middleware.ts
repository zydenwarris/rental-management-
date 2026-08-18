import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { hasDatabase } from "../config/env.js";
import { ensureLandlord } from "./auth/landlords.js";
import { verifyAccessToken } from "./auth/verifyToken.js";
import { ApiError, ErrorCode, isApiError, type ErrorDetail } from "./errors.js";
import type { ErrorResponse } from "./http.js";
import type { RequestContext } from "./types.js";

const BEARER_PREFIX = "Bearer ";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx: RequestContext;
    }
  }
}

/**
 * Establishes who is acting, for every route below it.
 *
 * This is the one place identity enters the system. Every service already scopes reads
 * and writes to ctx.landlordId, so authorisation across the whole API follows from this
 * single assignment being correct.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  // Express 4 does not catch rejections from async middleware; without this the request
  // would hang instead of answering 401.
  authenticate(req).then(() => next(), next);
};

async function authenticate(req: Request): Promise<void> {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith(BEARER_PREFIX)
    ? header.slice(BEARER_PREFIX.length).trim()
    : "";

  if (token === "") {
    throw ApiError.unauthorized("This endpoint requires a signed-in user.");
  }

  const user = await verifyAccessToken(token);
  // Nothing to attach the landlord to when running on the in-memory repositories.
  if (hasDatabase) await ensureLandlord(user);
  req.ctx = { landlordId: user.id };
}

/**
 * Wraps an async handler so a rejection reaches the error middleware.
 * Express 4 does not catch async throws on its own — without this, a thrown
 * ApiError would hang the request instead of producing a response.
 */
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

/** Parses and replaces req.body; a failure becomes a typed VALIDATION_ERROR. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(fromZodError(result.error));
      return;
    }
    req.body = result.data;
    next();
  };
}

function fromZodError(error: ZodError): ApiError {
  const details: ErrorDetail[] = error.issues.map((issue) => ({
    field: issue.path.join(".") || "(body)",
    message: issue.message,
  }));
  return ApiError.validation("Request validation failed.", details);
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ErrorResponse = {
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${req.method} ${req.path} does not exist.`,
      details: [],
    },
  };
  res.status(404).json(body);
}

/**
 * The only place errors become HTTP. Expected errors (ApiError) map to their
 * status and code; everything else is a bug or infrastructure failure — logged
 * loudly, returned as an opaque 500 so internals never leak.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isApiError(error)) {
    const body: ErrorResponse = {
      error: { code: error.code, message: error.message, details: error.details },
    };
    res.status(error.statusCode).json(body);
    return;
  }

  console.error("Unhandled error:", error);
  const body: ErrorResponse = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: "An unexpected error occurred.",
      details: [],
    },
  };
  res.status(500).json(body);
}
