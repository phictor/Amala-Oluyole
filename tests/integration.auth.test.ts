/**
 * INTEGRATION TESTS — Authentication & Session Management
 * Tests the auth flow, session cookie, and role assignment.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "../server/_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createCtx(overrides: Partial<AuthenticatedUser> = {}): { ctx: TrpcContext; clearedCookies: Array<{ name: string; options: Record<string, unknown> }> } {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@amalaoluyole.com",
    name: "Test Customer",
    loginMethod: "manus",
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    phone: null,
    isGuest: false,
    pushToken: null,
    preferredBranchId: null,
    ...overrides,
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {}, hostname: "localhost" } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createGuestCtx(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {}, hostname: "localhost" } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx };
}

describe("auth.me — session identity", () => {
  it("returns the authenticated user's identity", async () => {
    const { ctx } = createCtx({ email: "rider@amalaoluyole.com", role: "rider" });
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me?.email).toBe("rider@amalaoluyole.com");
    expect(me?.role).toBe("rider");
  });

  it("returns null for unauthenticated request", async () => {
    const { ctx } = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    const me = await caller.auth.me();
    expect(me).toBeNull();
  });
});

describe("auth.logout — session termination", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });

  it("logout succeeds even for unauthenticated request (idempotent)", async () => {
    const { ctx } = createGuestCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
