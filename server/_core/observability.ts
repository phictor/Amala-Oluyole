import * as Sentry from "@sentry/node";
import type { NextFunction, Request, Response } from "express";
import pino from "pino";

const environment = process.env.SENTRY_ENVIRONMENT || process.env.APP_ENV || process.env.NODE_ENV || "development";
const sentryDsn = process.env.SENTRY_DSN?.trim();

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment,
    sendDefaultPii: false,
    tracesSampleRate: environment === "production" ? 0.1 : 0.25,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { service: "amala-oluyole-api", environment },
  redact: {
    remove: true,
    paths: [
      "authorization", "cookie", "cookies", "accessToken", "refreshToken", "token",
      "secret", "password", "headers.authorization", "headers.cookie",
      "req.headers.authorization", "req.headers.cookie", "request.headers.authorization",
      "request.headers.cookie", "customerAddress", "deliveryAddress", "user",
    ],
  },
});

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info({
      event: "http_request",
      requestId: res.locals.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });
  next();
}

export function captureServerError(error: unknown, context: Record<string, string | number | undefined>): void {
  logger.error({ event: "server_error", errorType: error instanceof Error ? error.name : "unknown", ...context });
  if (!sentryDsn) return;
  Sentry.captureException(error, { tags: context });
}
