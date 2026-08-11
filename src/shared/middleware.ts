import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { ApiError, ErrorCode, isApiError, type ErrorDetail } from "./errors.js";
import type { ErrorResponse } from "./http.js";
import type { RequestContext } from "./types.js";

/**
 * The single development landlord. When authentication lands, attachContext is
 * the one middleware that changes (deriving landlordId from the session/token);
 * every service already reads the context, so nothing else moves.
 */
export const DEV_LANDLORD_ID = "lord_dev_000000000000";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      ctx: RequestContext;
    }
  }
}

export function attachContext(req: Request, _res: Response, next: NextFunction): void {
  req.ctx = { landlordId: DEV_LANDLORD_ID };
  next();
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
