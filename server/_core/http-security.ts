import crypto from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, NextFunction, Request, Response } from "express";
import { COOKIE_NAME, CSRF_COOKIE_NAME } from "../../shared/const.js";
import { ENV } from "./env";
import { captureServerError, logger, requestLogger } from "./observability";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function isApprovedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (ENV.allowedOrigins.includes(origin)) return true;
  if (!ENV.isProduction) {
    try { return ["localhost", "127.0.0.1"].includes(new URL(origin).hostname); } catch { return false; }
  }
  return false;
}

function ratePolicy(req: Request): { limit: number; windowMs: number; group: string } | null {
  const path = req.originalUrl;
  if (/\/api\/oauth|\/api\/auth\/(session|refresh)|\/api\/integrity\/challenge/.test(path)) return { limit: 20, windowMs: 60_000, group: "auth" };
  if (/orders\.(place|initializePayment|verifyPayment)|validatePromo/.test(path)) return { limit: 20, windowMs: 60_000, group: "checkout" };
  if (/rider\.(updateLocation|setStatus|updateOrderStatus)/.test(path)) return { limit: 120, windowMs: 60_000, group: "rider" };
  if (/admin\./.test(path)) return { limit: 60, windowMs: 60_000, group: "admin" };
  return null;
}

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const policy = ratePolicy(req);
  if (!policy) return next();
  const now = Date.now();
  const key = `${policy.group}:${req.ip}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + policy.windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  res.setHeader("RateLimit-Limit", String(policy.limit));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, policy.limit - bucket.count)));
  if (bucket.count > policy.limit) {
    logger.warn({ event: "rate_limit", requestId: res.locals.requestId, group: policy.group });
    return void res.status(429).json({ error: "Too many requests" });
  }
  next();
}

function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (/^\/api\/(paystack\/webhook|oauth\/)/.test(req.path)) return next();
  if (req.headers.authorization?.startsWith("Bearer ")) return next();
  const parsed = parseCookieHeader(req.headers.cookie ?? "");
  if (!parsed[COOKIE_NAME]) return next();
  const header = req.headers["x-csrf-token"];
  const token = parsed[CSRF_COOKIE_NAME];
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  if (!isApprovedOrigin(origin) || typeof header !== "string" || !token || header.length !== token.length || !crypto.timingSafeEqual(Buffer.from(header), Buffer.from(token))) {
    logger.warn({ event: "csrf_rejected", requestId: res.locals.requestId });
    return void res.status(403).json({ error: "Request rejected" });
  }
  next();
}

export function installHttpSecurity(app: Express) {
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const supplied = req.headers["x-request-id"];
    const requestId = typeof supplied === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (ENV.isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (/^\/api\/(auth|trpc|riders)/.test(req.path)) res.setHeader("Cache-Control", "no-store, private");
    next();
  });
  app.use(requestLogger);
  app.use((req, res, next) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    if (origin && isApprovedOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Request-Id, X-App-Integrity-Platform, X-App-Integrity-Challenge, X-App-Integrity-Assertion");
    }
    if (req.method === "OPTIONS") return void (origin && !isApprovedOrigin(origin) ? res.sendStatus(403) : res.sendStatus(204));
    next();
  });
  app.use(rateLimit);
  app.use(csrfProtection);
}

export function productionErrorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  captureServerError(error, { requestId: res.locals.requestId, event: "request_error" });
  if (res.headersSent) return;
  res.status(500).json({ error: ENV.isProduction ? "Internal server error" : error instanceof Error ? error.message : "Internal server error" });
}
