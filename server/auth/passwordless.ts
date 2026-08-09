import crypto from "crypto";
import { Resend } from "resend";
import twilio from "twilio";
import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  loginChallenges,
  users,
  type LoginChallenge,
  type User,
} from "../../drizzle/schema";
import { getDb, getUserByOpenId, upsertUser } from "../db";

export const PASSWORDLESS_CHALLENGE_TTL_MS = 10 * 60 * 1_000;
export const PASSWORDLESS_MAX_ATTEMPTS = 5;

type PasswordlessChannel = "email" | "phone";

type NewLoginChallenge = Pick<
  LoginChallenge,
  "id" | "channel" | "destination" | "codeHash" | "attempts" | "expiresAt"
>;

export interface PasswordlessDependencies {
  secret: () => string;
  now: () => Date;
  randomCode: () => string;
  deliverCode: (channel: PasswordlessChannel, destination: string, code: string) => Promise<void>;
  insertChallenge: (challenge: NewLoginChallenge) => Promise<void>;
  findChallenge: (id: string) => Promise<LoginChallenge | undefined>;
  incrementFailedAttempt: (id: string, now: Date) => Promise<void>;
  consumeChallenge: (id: string, now: Date) => Promise<boolean>;
  findUsers: (channel: PasswordlessChannel, destination: string) => Promise<User[]>;
  createCustomer: (channel: PasswordlessChannel, destination: string, openId: string, now: Date) => Promise<User>;
  touchUser: (user: User, channel: PasswordlessChannel, destination: string, now: Date) => Promise<User>;
}

const challengeInputSchema = z.object({
  channel: z.enum(["email", "phone"]),
  identifier: z.string().trim().min(3).max(320),
}).strict();

const verifyInputSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
}).strict();

export class PasswordlessInputError extends Error {}
export class PasswordlessVerificationError extends Error {}
export class PasswordlessUnavailableError extends Error {}

function requireStrongSecret(secret: string): string {
  const normalized = secret.trim();
  if (normalized.length < 32) throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
  return normalized;
}

export function normalizePasswordlessIdentifier(channel: PasswordlessChannel, raw: string): string {
  const value = raw.trim().normalize("NFKC");
  if (channel === "email") {
    const normalized = value.toLowerCase();
    const separator = normalized.indexOf("@");
    if (separator <= 0 || separator !== normalized.lastIndexOf("@")) throw new PasswordlessInputError("Invalid sign-in request");
    const local = normalized.slice(0, separator);
    const domain = normalized.slice(separator + 1);
    const domainLabels = domain.split(".");
    const validLocal = local.length <= 64 && !local.startsWith(".") && !local.endsWith(".") && !local.includes("..")
      && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local);
    const validDomain = domain.length <= 253 && domainLabels.length >= 2
      && domainLabels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
    if (!validLocal || !validDomain || normalized.length > 320) throw new PasswordlessInputError("Invalid sign-in request");
    return normalized;
  }

  if (!/^[+0-9\s()-]+$/.test(value) || value.length > 32) throw new PasswordlessInputError("Invalid sign-in request");
  const compact = value.replace(/[\s()-]/g, "");
  const normalized = compact.startsWith("+234")
    ? compact
    : compact.startsWith("234")
      ? `+${compact}`
      : /^0\d{10}$/.test(compact)
        ? `+234${compact.slice(1)}`
        : compact;
  if (!/^\+234[789]\d{9}$/.test(normalized)) throw new PasswordlessInputError("Invalid sign-in request");
  return normalized;
}

export function generateOneTimeCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashOneTimeCode(challengeId: string, code: string, secret: string): string {
  return crypto.createHmac("sha256", requireStrongSecret(secret)).update(`${challengeId}:${code}`, "utf8").digest("hex");
}

function codeMatches(challengeId: string, code: string, expectedHash: string, secret: string): boolean {
  const suppliedHash = hashOneTimeCode(challengeId, code, secret);
  const expected = Buffer.from(expectedHash, "hex");
  const supplied = Buffer.from(suppliedHash, "hex");
  return expected.length === supplied.length && expected.length === 32 && crypto.timingSafeEqual(expected, supplied);
}

export function buildPasswordlessOpenId(channel: PasswordlessChannel, destination: string, secret: string): string {
  const digest = crypto.createHmac("sha256", requireStrongSecret(secret)).update(`${channel}:${destination}`, "utf8").digest("base64url");
  return `passwordless:${channel === "email" ? "e" : "p"}:${digest}`;
}

export function maskPasswordlessDestination(channel: PasswordlessChannel, destination: string): string {
  if (channel === "email") {
    const [local, domain] = destination.split("@");
    return `${local.slice(0, Math.min(2, local.length))}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
  }
  return `${destination.slice(0, 4)}••••••${destination.slice(-4)}`;
}

export function createPasswordlessService(dependencies: PasswordlessDependencies) {
  return {
    async requestChallenge(input: unknown) {
      const parsed = challengeInputSchema.safeParse(input);
      if (!parsed.success) throw new PasswordlessInputError("Invalid sign-in request");
      const destination = normalizePasswordlessIdentifier(parsed.data.channel, parsed.data.identifier);
      const id = crypto.randomUUID();
      const code = dependencies.randomCode();
      if (!/^\d{6}$/.test(code)) throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
      const codeHash = hashOneTimeCode(id, code, dependencies.secret());
      const expiresAt = new Date(dependencies.now().getTime() + PASSWORDLESS_CHALLENGE_TTL_MS);

      try {
        await dependencies.deliverCode(parsed.data.channel, destination, code);
      } catch {
        throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
      }
      await dependencies.insertChallenge({
        id,
        channel: parsed.data.channel,
        destination,
        codeHash,
        attempts: 0,
        expiresAt,
      });

      return {
        challengeId: id,
        expiresInSeconds: PASSWORDLESS_CHALLENGE_TTL_MS / 1_000,
        destinationHint: maskPasswordlessDestination(parsed.data.channel, destination),
      };
    },

    async verifyChallenge(input: unknown): Promise<User> {
      const parsed = verifyInputSchema.safeParse(input);
      if (!parsed.success) throw new PasswordlessInputError("Invalid sign-in request");
      const challenge = await dependencies.findChallenge(parsed.data.challengeId);
      const now = dependencies.now();
      if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= now.getTime()
        || challenge.attempts >= PASSWORDLESS_MAX_ATTEMPTS) {
        throw new PasswordlessVerificationError("Invalid or expired sign-in code");
      }

      if (!codeMatches(challenge.id, parsed.data.code, challenge.codeHash, dependencies.secret())) {
        await dependencies.incrementFailedAttempt(challenge.id, now);
        throw new PasswordlessVerificationError("Invalid or expired sign-in code");
      }

      const matchingUsers = await dependencies.findUsers(challenge.channel, challenge.destination);
      if (matchingUsers.length > 1) throw new PasswordlessVerificationError("Invalid or expired sign-in code");
      const user = matchingUsers[0]
        ? await dependencies.touchUser(matchingUsers[0], challenge.channel, challenge.destination, now)
        : await dependencies.createCustomer(
          challenge.channel,
          challenge.destination,
          buildPasswordlessOpenId(challenge.channel, challenge.destination, dependencies.secret()),
          now,
        );

      if (!await dependencies.consumeChallenge(challenge.id, now)) {
        throw new PasswordlessVerificationError("Invalid or expired sign-in code");
      }
      return user;
    },
  };
}

async function requireDatabase() {
  const database = await getDb();
  if (!database) throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
  return database;
}

function affectedRows(result: unknown): number {
  const header = (Array.isArray(result) ? result[0] : result) as { affectedRows?: number } | undefined;
  return header?.affectedRows ?? 0;
}

async function deliverCode(channel: PasswordlessChannel, destination: string, code: string): Promise<void> {
  const message = `Your Amala Oluyole sign-in code is ${code}. It expires in 10 minutes. Never share this code.`;
  if (channel === "email") {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = (process.env.EMAIL_FROM ?? process.env.RESEND_FROM_EMAIL)?.trim();
    if (!apiKey || !from) throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
    const result = await new Resend(apiKey).emails.send({
      from: `Amala Oluyole <${from}>`,
      to: destination,
      subject: "Your Amala Oluyole sign-in code",
      text: message,
    });
    if (result.error) throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const smsFrom = process.env.TWILIO_SMS_FROM?.trim();
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || (!smsFrom && !whatsappFrom)) {
    throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
  }
  const useWhatsApp = !smsFrom;
  await twilio(accountSid, authToken).messages.create({
    from: useWhatsApp
      ? (whatsappFrom!.startsWith("whatsapp:") ? whatsappFrom! : `whatsapp:${whatsappFrom}`)
      : smsFrom!,
    to: useWhatsApp ? `whatsapp:${destination}` : destination,
    body: message,
  });
}

const productionDependencies: PasswordlessDependencies = {
  secret: () => process.env.JWT_SECRET ?? "",
  now: () => new Date(),
  randomCode: generateOneTimeCode,
  deliverCode,
  async insertChallenge(challenge) {
    const database = await requireDatabase();
    await database.insert(loginChallenges).values(challenge);
  },
  async findChallenge(id) {
    const database = await requireDatabase();
    const [challenge] = await database.select().from(loginChallenges).where(eq(loginChallenges.id, id)).limit(1);
    return challenge;
  },
  async incrementFailedAttempt(id, now) {
    const database = await requireDatabase();
    await database.update(loginChallenges).set({ attempts: sql`${loginChallenges.attempts} + 1` }).where(and(
      eq(loginChallenges.id, id),
      isNull(loginChallenges.consumedAt),
      gt(loginChallenges.expiresAt, now),
      lt(loginChallenges.attempts, PASSWORDLESS_MAX_ATTEMPTS),
    ));
  },
  async consumeChallenge(id, now) {
    const database = await requireDatabase();
    const result = await database.update(loginChallenges).set({ consumedAt: now }).where(and(
      eq(loginChallenges.id, id),
      isNull(loginChallenges.consumedAt),
      gt(loginChallenges.expiresAt, now),
      lt(loginChallenges.attempts, PASSWORDLESS_MAX_ATTEMPTS),
    ));
    return affectedRows(result) === 1;
  },
  async findUsers(channel, destination) {
    const database = await requireDatabase();
    if (channel === "email") {
      return database.select().from(users)
        .where(sql`LOWER(TRIM(${users.email})) = ${destination}`)
        .limit(2);
    }
    const national = `0${destination.slice(4)}`;
    return database.select().from(users)
      .where(inArray(users.phone, [destination, destination.slice(1), national]))
      .limit(2);
  },
  async createCustomer(channel, destination, openId, now) {
    await upsertUser({
      openId,
      role: "customer",
      loginMethod: `passwordless_${channel}`,
      lastSignedIn: now,
      ...(channel === "email" ? { email: destination } : { phone: destination }),
    });
    const user = await getUserByOpenId(openId);
    if (!user) throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
    return user;
  },
  async touchUser(user, channel, destination, now) {
    await upsertUser({
      openId: user.openId,
      lastSignedIn: now,
      ...(channel === "email" ? { email: destination } : { phone: destination }),
    });
    const refreshed = await getUserByOpenId(user.openId);
    if (!refreshed) throw new PasswordlessUnavailableError("Passwordless sign-in unavailable");
    return refreshed;
  },
};

const passwordlessService = createPasswordlessService(productionDependencies);

export const requestPasswordlessChallenge = passwordlessService.requestChallenge;
export const verifyPasswordlessChallenge = passwordlessService.verifyChallenge;
