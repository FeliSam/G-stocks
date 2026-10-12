import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../shared/errors.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        email: string;
        name: string;
        isPlatformAdmin: boolean;
      };
      tenant?: {
        organizationId: string;
        organizationSlug: string;
        organizationName: string;
        membershipId: string;
        roles: string[];
        permissions: Set<string>;
        subscriptionStatus: string;
        negativeStockPolicy: "FORBID" | "WARN" | "ALLOW";
        activeModules: Set<string>;
      };
    }
  }
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.header("X-Request-Id");
  const requestId =
    incomingId && /^[a-zA-Z0-9_-]{4,64}$/.test(incomingId)
      ? incomingId
      : crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitMiddleware(maxRequests = 120, windowMs = 60_000) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === "test") {
      return next();
    }
    const key = `${req.ip || "local"}:${req.baseUrl}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return next(
        new AppError(429, "RATE_LIMIT_EXCEEDED", "Trop de requêtes. Veuillez patienter quelques instants.")
      );
    }
    next();
  };
}

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId || crypto.randomUUID();

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        request_id: requestId,
        details: err.details,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: err.issues[0]?.message || "Les données soumises sont invalides.",
        request_id: requestId,
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }

  console.error(
    JSON.stringify({
      level: "error",
      request_id: requestId,
      method: req.method,
      path: req.originalUrl,
      message: err instanceof Error ? err.message : "Unknown error",
    })
  );

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Une erreur interne est survenue.",
      request_id: requestId,
    },
  });
}
