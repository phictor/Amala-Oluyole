import { describe, expect, it } from "vitest";
import type { LoginChallenge, User } from "../drizzle/schema";
import {
  PASSWORDLESS_CHALLENGE_TTL_MS,
  PASSWORDLESS_MAX_ATTEMPTS,
  PasswordlessInputError,
  PasswordlessVerificationError,
  createPasswordlessService,
  generateOneTimeCode,
  hashOneTimeCode,
  normalizePasswordlessIdentifier,
  type PasswordlessDependencies,
} from "../server/auth/passwordless";

const TEST_SECRET = "passwordless-test-secret-with-at-least-32-characters";
const TEST_CODE = "123456";

function user(overrides: Partial<User> = {}): User {
  const now = new Date("2026-08-09T12:00:00.000Z");
  return {
    id: 1,
    openId: "existing-user",
    name: "Existing User",
    email: "finance@example.com",
    phone: null,
    loginMethod: "passwordless_email",
    role: "finance",
    isGuest: false,
    pushToken: null,
    preferredBranchId: null,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    ...overrides,
  };
}

function harness(initialUsers: User[] = []) {
  let currentTime = new Date("2026-08-09T12:00:00.000Z");
  let challenge: LoginChallenge | undefined;
  const delivered: Array<{ channel: "email" | "phone"; destination: string; code: string }> = [];
  const users = [...initialUsers];

  const dependencies: PasswordlessDependencies = {
    secret: () => TEST_SECRET,
    now: () => new Date(currentTime),
    randomCode: () => TEST_CODE,
    async deliverCode(channel, destination, code) {
      delivered.push({ channel, destination, code });
    },
    async insertChallenge(value) {
      challenge = { ...value, consumedAt: null, createdAt: new Date(currentTime) };
    },
    async findChallenge(id) {
      return challenge?.id === id ? { ...challenge } : undefined;
    },
    async incrementFailedAttempt(id, now) {
      if (challenge?.id === id && !challenge.consumedAt && challenge.expiresAt > now
        && challenge.attempts < PASSWORDLESS_MAX_ATTEMPTS) {
        challenge = { ...challenge, attempts: challenge.attempts + 1 };
      }
    },
    async consumeChallenge(id, now) {
      if (!challenge || challenge.id !== id || challenge.consumedAt || challenge.expiresAt <= now
        || challenge.attempts >= PASSWORDLESS_MAX_ATTEMPTS) return false;
      challenge = { ...challenge, consumedAt: new Date(now) };
      return true;
    },
    async findUsers(channel, destination) {
      return users.filter((candidate) => channel === "email"
        ? candidate.email?.toLowerCase() === destination
        : candidate.phone === destination);
    },
    async createCustomer(channel, destination, openId, now) {
      const created = user({
        id: users.length + 1,
        openId,
        name: null,
        email: channel === "email" ? destination : null,
        phone: channel === "phone" ? destination : null,
        loginMethod: `passwordless_${channel}`,
        role: "customer",
        lastSignedIn: now,
      });
      users.push(created);
      return created;
    },
    async touchUser(existing, channel, destination, now) {
      const refreshed = {
        ...existing,
        email: channel === "email" ? destination : existing.email,
        phone: channel === "phone" ? destination : existing.phone,
        lastSignedIn: now,
      };
      users.splice(users.findIndex((candidate) => candidate.id === existing.id), 1, refreshed);
      return refreshed;
    },
  };

  return {
    service: createPasswordlessService(dependencies),
    delivered,
    users,
    challenge: () => challenge,
    advanceBy(ms: number) {
      currentTime = new Date(currentTime.getTime() + ms);
    },
  };
}

describe("passwordless identity validation", () => {
  it("normalizes lowercase email and common Nigerian mobile formats", () => {
    expect(normalizePasswordlessIdentifier("email", "  Ada.Example@Example.COM ")).toBe("ada.example@example.com");
    expect(normalizePasswordlessIdentifier("phone", "0801 234 5678")).toBe("+2348012345678");
    expect(normalizePasswordlessIdentifier("phone", "234-801-234-5678")).toBe("+2348012345678");
    expect(normalizePasswordlessIdentifier("phone", "+234 (801) 234-5678")).toBe("+2348012345678");
  });

  it("rejects malformed email, non-Nigerian phone, and extra request properties", async () => {
    expect(() => normalizePasswordlessIdentifier("email", "not-an-email")).toThrow(PasswordlessInputError);
    expect(() => normalizePasswordlessIdentifier("phone", "+447700900123")).toThrow(PasswordlessInputError);
    await expect(harness().service.requestChallenge({
      channel: "email",
      identifier: "customer@example.com",
      role: "admin",
    })).rejects.toThrow(PasswordlessInputError);
  });
});

describe("passwordless challenge security", () => {
  it("creates a random six-digit code and stores only its challenge-bound HMAC", async () => {
    for (let index = 0; index < 50; index += 1) expect(generateOneTimeCode()).toMatch(/^\d{6}$/);

    const state = harness();
    const response = await state.service.requestChallenge({ channel: "email", identifier: "Customer@Example.com" });
    const stored = state.challenge();
    expect(response).toMatchObject({ expiresInSeconds: 600, destinationHint: "cu******@example.com" });
    expect(response).not.toHaveProperty("code");
    expect(state.delivered).toEqual([{ channel: "email", destination: "customer@example.com", code: TEST_CODE }]);
    expect(stored?.codeHash).toBe(hashOneTimeCode(response.challengeId, TEST_CODE, TEST_SECRET));
    expect(stored?.codeHash).not.toContain(TEST_CODE);
    expect(JSON.stringify({ response, stored })).not.toContain(`\"code\":\"${TEST_CODE}\"`);
    expect(hashOneTimeCode("00000000-0000-4000-8000-000000000001", TEST_CODE, TEST_SECRET))
      .not.toBe(hashOneTimeCode("00000000-0000-4000-8000-000000000002", TEST_CODE, TEST_SECRET));
  });

  it("allows one successful verification and rejects replay", async () => {
    const state = harness();
    const { challengeId } = await state.service.requestChallenge({ channel: "phone", identifier: "08012345678" });
    await expect(state.service.verifyChallenge({ challengeId, code: TEST_CODE })).resolves.toMatchObject({ role: "customer" });
    await expect(state.service.verifyChallenge({ challengeId, code: TEST_CODE })).rejects.toThrow(PasswordlessVerificationError);
  });

  it("expires challenges after ten minutes", async () => {
    const state = harness();
    const { challengeId } = await state.service.requestChallenge({ channel: "email", identifier: "customer@example.com" });
    state.advanceBy(PASSWORDLESS_CHALLENGE_TTL_MS);
    await expect(state.service.verifyChallenge({ challengeId, code: TEST_CODE })).rejects.toThrow(PasswordlessVerificationError);
  });

  it("locks a challenge after the maximum failed attempts", async () => {
    const state = harness();
    const { challengeId } = await state.service.requestChallenge({ channel: "email", identifier: "customer@example.com" });
    for (let attempt = 0; attempt < PASSWORDLESS_MAX_ATTEMPTS; attempt += 1) {
      await expect(state.service.verifyChallenge({ challengeId, code: "000000" })).rejects.toThrow(PasswordlessVerificationError);
    }
    expect(state.challenge()?.attempts).toBe(PASSWORDLESS_MAX_ATTEMPTS);
    await expect(state.service.verifyChallenge({ challengeId, code: TEST_CODE })).rejects.toThrow(PasswordlessVerificationError);
  });
});

describe("passwordless role assignment", () => {
  it("preserves the server-controlled role for an existing user", async () => {
    const financeUser = user({ role: "finance", email: "finance@example.com" });
    const state = harness([financeUser]);
    const { challengeId } = await state.service.requestChallenge({ channel: "email", identifier: "FINANCE@example.com" });
    const signedIn = await state.service.verifyChallenge({ challengeId, code: TEST_CODE });
    expect(signedIn.role).toBe("finance");
    expect(state.users).toHaveLength(1);
  });

  it("creates every new passwordless identity as a customer", async () => {
    const state = harness();
    const { challengeId } = await state.service.requestChallenge({ channel: "phone", identifier: "08012345678" });
    const signedIn = await state.service.verifyChallenge({ challengeId, code: TEST_CODE });
    expect(signedIn).toMatchObject({ role: "customer", phone: "+2348012345678", loginMethod: "passwordless_phone" });
  });
});
