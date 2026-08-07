import crypto from "crypto";
import type { Request } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { appIntegrityChallenges } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "../db";

export type IntegrityPlatform = "android" | "ios";
const CHALLENGE_TTL_MS = 2 * 60 * 1000;

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function createIntegrityChallenge(userId: number, platform: IntegrityPlatform, operation: string) {
  const db = await getDb();
  if (!db) throw new Error("Integrity service unavailable");
  const nonce = crypto.randomBytes(32).toString("base64url");
  await db.insert(appIntegrityChallenges).values({
    nonceHash: digest(nonce), userId, platform, operation, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
  return { nonce, expiresInSeconds: CHALLENGE_TTL_MS / 1000 };
}

async function verifyWithProvider(input: { platform: IntegrityPlatform; assertion: string; nonce: string }) {
  const prefix = input.platform === "android" ? "PLAY_INTEGRITY" : "APPLE_APP_ATTEST";
  const endpoint = process.env[`${prefix}_VERIFIER_URL`];
  const credential = process.env[`${prefix}_VERIFIER_TOKEN`];
  if (!endpoint || !credential) throw new Error("Integrity verifier is not configured");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
    body: JSON.stringify({ assertion: input.assertion, nonce: input.nonce }),
  });
  const result = await response.json().catch(() => null) as {
    valid?: boolean; nonce?: string; appId?: string; timestampMs?: number; deviceVerdict?: string;
  } | null;
  if (!response.ok || !result?.valid) throw new Error("Integrity assertion is invalid");
  if (result.nonce !== input.nonce || result.appId !== ENV.appId) throw new Error("Integrity identity mismatch");
  if (!result.timestampMs || Math.abs(Date.now() - result.timestampMs) > CHALLENGE_TTL_MS) throw new Error("Integrity assertion is stale");
  if (result.deviceVerdict && !["MEETS_DEVICE_INTEGRITY", "APP_ATTEST_VALID", "DEVICECHECK_VALID"].includes(result.deviceVerdict)) {
    throw new Error("Device integrity requirement was not met");
  }
}

export async function requireAppIntegrity(req: Request, userId: number, operation: string): Promise<void> {
  const isNativeBearerRequest = req.headers.authorization?.startsWith("Bearer ") === true;
  const enforce = (ENV.isProduction && isNativeBearerRequest) || process.env.INTEGRITY_ENFORCE === "true";
  const platform = req.headers["x-app-integrity-platform"];
  const nonce = req.headers["x-app-integrity-challenge"];
  const assertion = req.headers["x-app-integrity-assertion"];
  if (!enforce && (!platform || !nonce || !assertion)) return;
  if ((platform !== "android" && platform !== "ios") || typeof nonce !== "string" || typeof assertion !== "string") {
    throw new Error("App integrity proof is required");
  }
  const db = await getDb();
  if (!db) throw new Error("Integrity service unavailable");
  const [challenge] = await db.select().from(appIntegrityChallenges).where(and(
    eq(appIntegrityChallenges.nonceHash, digest(nonce)), eq(appIntegrityChallenges.userId, userId),
    eq(appIntegrityChallenges.platform, platform), eq(appIntegrityChallenges.operation, operation),
    isNull(appIntegrityChallenges.usedAt), gt(appIntegrityChallenges.expiresAt, new Date()),
  )).limit(1);
  if (!challenge) throw new Error("Integrity challenge is invalid, expired, or replayed");
  await verifyWithProvider({ platform, assertion, nonce });
  const result = await db.update(appIntegrityChallenges).set({ usedAt: new Date() }).where(and(
    eq(appIntegrityChallenges.id, challenge.id), isNull(appIntegrityChallenges.usedAt),
  ));
  const header = (Array.isArray(result) ? result[0] : result) as unknown as { affectedRows?: number };
  if (header.affectedRows === 0) throw new Error("Integrity assertion was replayed");
}
