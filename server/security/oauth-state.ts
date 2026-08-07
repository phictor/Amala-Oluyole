import crypto from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { oauthStates } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";

export const OAUTH_BINDING_COOKIE = "oauth_state_binding";
const STATE_TTL_MS = 10 * 60 * 1000;

function digest(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function isAllowedOAuthRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    if (["amalaoluyole:", "manusapp:"].includes(url.protocol)) {
      return (url.hostname === "oauth" && url.pathname === "/callback") ||
        (!url.hostname && url.pathname === "/oauth/callback");
    }
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) return false;
    const originAllowed = ENV.allowedOrigins.includes(url.origin) ||
      (process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname));
    return originAllowed && ["/api/oauth/callback", "/oauth/callback"].includes(url.pathname);
  } catch {
    return false;
  }
}

export async function issueOAuthState(redirectUri: string, sessionBinding?: string) {
  if (!isAllowedOAuthRedirect(redirectUri)) throw new Error("OAuth redirect is not allowed");
  const db = await getDb();
  if (!db) throw new Error("OAuth state service unavailable");
  const state = crypto.randomBytes(32).toString("base64url");
  const binding = sessionBinding || crypto.randomBytes(32).toString("base64url");
  await db.insert(oauthStates).values({
    stateHash: digest(state),
    redirectUri,
    sessionBindingHash: digest(binding),
    expiresAt: new Date(Date.now() + STATE_TTL_MS),
  });
  return { state, binding, expiresInSeconds: STATE_TTL_MS / 1000 };
}

export async function consumeOAuthState(state: string, sessionBinding: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("OAuth state service unavailable");
  return db.transaction(async (tx) => {
    const [record] = await tx.select().from(oauthStates).where(and(
      eq(oauthStates.stateHash, digest(state)),
      eq(oauthStates.sessionBindingHash, digest(sessionBinding)),
      isNull(oauthStates.usedAt),
      gt(oauthStates.expiresAt, new Date()),
    )).limit(1);
    if (!record || !isAllowedOAuthRedirect(record.redirectUri)) throw new Error("OAuth state is invalid or expired");
    const result = await tx.update(oauthStates).set({ usedAt: new Date() }).where(and(
      eq(oauthStates.id, record.id), isNull(oauthStates.usedAt),
    ));
    const header = (Array.isArray(result) ? result[0] : result) as unknown as { affectedRows?: number };
    if (header.affectedRows === 0) throw new Error("OAuth state was already used");
    return record.redirectUri;
  });
}
