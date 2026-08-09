import crypto from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import {
  COOKIE_NAME,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  REFRESH_TTL_MS,
  SESSION_TTL_MS,
} from "../../shared/const.js";
import { getUserByOpenId, upsertUser } from "../db";
import {
  PasswordlessInputError,
  PasswordlessVerificationError,
  requestPasswordlessChallenge,
  verifyPasswordlessChallenge,
} from "../auth/passwordless";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { consumeOAuthState, issueOAuthState, OAUTH_BINDING_COOKIE } from "../security/oauth-state";

function query(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function cookies(req: Request): Record<string, string> {
  return parseCookieHeader(req.headers.cookie ?? "");
}

function issueCsrfCookie(req: Request, res: Response): string {
  const token = crypto.randomBytes(24).toString("base64url");
  const options = getSessionCookieOptions(req);
  res.cookie(CSRF_COOKIE_NAME, token, { ...options, httpOnly: false, sameSite: "strict", maxAge: REFRESH_TTL_MS });
  return token;
}

async function syncUser(userInfo: {
  openId?: string | null; name?: string | null; email?: string | null; loginMethod?: string | null; platform?: string | null;
}) {
  if (!userInfo.openId) throw new Error("Invalid identity response");
  await upsertUser({
    openId: userInfo.openId,
    name: userInfo.name || null,
    email: userInfo.email ?? null,
    loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
    lastSignedIn: new Date(),
  });
  const saved = await getUserByOpenId(userInfo.openId);
  if (!saved) throw new Error("User synchronization failed");
  return saved;
}

function publicUser(user: Awaited<ReturnType<typeof getUserByOpenId>>) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, loginMethod: user.loginMethod, role: user.role, lastSignedIn: user.lastSignedIn.toISOString() };
}

async function createTokenPair(openId: string, name: string) {
  return {
    accessToken: await sdk.createSessionToken(openId, { name, expiresInMs: SESSION_TTL_MS }),
    refreshToken: await sdk.createRefreshToken(openId),
  };
}

function setWebSession(req: Request, res: Response, pair: Awaited<ReturnType<typeof createTokenPair>>) {
  const options = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, pair.accessToken, { ...options, maxAge: SESSION_TTL_MS });
  res.cookie(REFRESH_COOKIE_NAME, pair.refreshToken, { ...options, maxAge: REFRESH_TTL_MS });
  issueCsrfCookie(req, res);
}

export function registerOAuthRoutes(app: Express) {
  app.post("/api/auth/passwordless/challenge", async (req, res) => {
    try {
      const result = await requestPasswordlessChallenge(req.body);
      res.setHeader("Cache-Control", "no-store");
      res.status(202).json(result);
    } catch (error) {
      res.setHeader("Cache-Control", "no-store");
      if (error instanceof PasswordlessInputError) {
        return void res.status(400).json({ error: "Unable to send sign-in code" });
      }
      res.status(503).json({ error: "Unable to send sign-in code" });
    }
  });

  app.post("/api/auth/passwordless/verify", async (req, res) => {
    try {
      const user = await verifyPasswordlessChallenge(req.body);
      const pair = await createTokenPair(user.openId, user.name || "");
      setWebSession(req, res, pair);
      res.setHeader("Cache-Control", "no-store");
      res.json({ ...pair, user: publicUser(user), expiresInSeconds: SESSION_TTL_MS / 1000 });
    } catch (error) {
      res.setHeader("Cache-Control", "no-store");
      if (error instanceof PasswordlessInputError) {
        return void res.status(400).json({ error: "Invalid or expired sign-in code" });
      }
      if (error instanceof PasswordlessVerificationError) {
        return void res.status(401).json({ error: "Invalid or expired sign-in code" });
      }
      res.status(503).json({ error: "Unable to complete sign-in" });
    }
  });

  app.get("/api/oauth/state", async (req, res) => {
    try {
      const redirectUri = query(req, "redirectUri");
      if (!redirectUri) return void res.status(400).json({ error: "redirectUri is required" });
      const suppliedBinding = req.headers["x-oauth-binding"];
      const existingBinding = typeof suppliedBinding === "string" ? suppliedBinding : cookies(req)[OAUTH_BINDING_COOKIE];
      const result = await issueOAuthState(redirectUri, existingBinding);
      const options = getSessionCookieOptions(req);
      res.cookie(OAUTH_BINDING_COOKIE, result.binding, { ...options, sameSite: "lax", maxAge: result.expiresInSeconds * 1000 });
      res.setHeader("Cache-Control", "no-store");
      res.json(result);
    } catch {
      res.status(400).json({ error: "Unable to start sign-in" });
    }
  });

  app.get("/api/oauth/callback", async (req, res) => {
    const code = query(req, "code");
    const state = query(req, "state");
    const binding = cookies(req)[OAUTH_BINDING_COOKIE];
    if (!code || !state || !binding) return void res.status(400).json({ error: "Invalid sign-in callback" });
    try {
      const redirectUri = await consumeOAuthState(state, binding);
      const tokenResponse = await sdk.exchangeCodeForToken(code, redirectUri);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      setWebSession(req, res, await createTokenPair(user.openId, user.name || ""));
      const frontend = process.env.EXPO_WEB_PREVIEW_URL || process.env.EXPO_PACKAGER_PROXY_URL || "http://localhost:8081";
      res.redirect(302, frontend);
    } catch {
      res.status(400).json({ error: "Sign-in failed" });
    }
  });

  app.post("/api/oauth/mobile", async (req, res) => {
    const { code, state, binding } = (req.body ?? {}) as Record<string, unknown>;
    if (typeof code !== "string" || typeof state !== "string" || typeof binding !== "string") {
      return void res.status(400).json({ error: "Invalid sign-in callback" });
    }
    try {
      const redirectUri = await consumeOAuthState(state, binding);
      const tokenResponse = await sdk.exchangeCodeForToken(code, redirectUri);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      const user = await syncUser(userInfo);
      const pair = await createTokenPair(user.openId, user.name || "");
      res.setHeader("Cache-Control", "no-store");
      res.json({ ...pair, user: publicUser(user), expiresInSeconds: SESSION_TTL_MS / 1000 });
    } catch {
      res.status(400).json({ error: "Sign-in failed" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
    const refresh = bodyToken ?? cookies(req)[REFRESH_COOKIE_NAME];
    const verified = await sdk.verifyRefreshToken(refresh);
    if (!verified) return void res.status(401).json({ error: "Authentication required" });
    const user = await getUserByOpenId(verified.openId);
    if (!user) return void res.status(401).json({ error: "Authentication required" });
    const pair = await createTokenPair(user.openId, user.name || "");
    res.setHeader("Cache-Control", "no-store");
    if (!bodyToken) {
      setWebSession(req, res, pair);
      res.json({ expiresInSeconds: SESSION_TTL_MS / 1000 });
    } else {
      res.json({ ...pair, expiresInSeconds: SESSION_TTL_MS / 1000 });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const options = getSessionCookieOptions(req);
    const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
    await sdk.revokeRefreshToken(bodyToken ?? cookies(req)[REFRESH_COOKIE_NAME]);
    for (const name of [COOKIE_NAME, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME, OAUTH_BINDING_COOKIE]) {
      res.clearCookie(name, { ...options, maxAge: -1 });
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.setHeader("Cache-Control", "no-store");
      res.json({ user: publicUser(user) });
    } catch {
      res.status(401).json({ error: "Authentication required", user: null });
    }
  });

  app.post("/api/auth/session", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      const authorization = req.headers.authorization;
      if (!authorization?.startsWith("Bearer ")) return void res.status(400).json({ error: "Bearer token required" });
      const options = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, authorization.slice(7).trim(), { ...options, maxAge: SESSION_TTL_MS });
      issueCsrfCookie(req, res);
      res.setHeader("Cache-Control", "no-store");
      res.json({ success: true, user: publicUser(user) });
    } catch {
      res.status(401).json({ error: "Authentication required" });
    }
  });
}
