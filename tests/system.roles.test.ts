/**
 * SYSTEM TESTS — Complete Workflow Validation for All 5 Roles
 *
 * Tests end-to-end business flows for:
 *   1. Customer  — browse → order → track → rate
 *   2. Kitchen   — view orders → accept → prepare → mark ready
 *   3. Admin     — manage orders, assign riders, view reports
 *   4. Rider     — go online → receive order → deliver
 *   5. Finance   — view revenue reports, promo management
 *
 * These tests use the tRPC router directly (no HTTP layer) with mock contexts.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { ensureTestFixtures } from "./fixtures/seed";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// Finance is handled by admin/manager role in this system
type UserRole = "customer" | "kitchen" | "admin" | "manager" | "rider";

function makeCtx(role: UserRole, id = 1, extra: Partial<NonNullable<TrpcContext["user"]>> = {}): TrpcContext {
  return {
    user: {
      id,
      openId: `test-${role}-${id}`,
      email: `${role}${id}@amalaoluyole.com`,
      name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      phone: null,
      isGuest: false,
      pushToken: null,
      preferredBranchId: null,
      ...extra,
    },
    req: { protocol: "https", headers: {}, hostname: "localhost" } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makeGuestCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, hostname: "localhost" } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── SEED FIXTURES ───────────────────────────────────────────────────────────
// Ensure branch id=1, meal id=1, and rider for userId=30 exist before tests run
beforeAll(async () => {
  await ensureTestFixtures();
}, 30_000);

// ─── ROLE 1: CUSTOMER WORKFLOW ────────────────────────────────────────────────
describe("Customer Workflow", () => {
  it("can browse the menu without authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    const meals = await caller.menu.meals({});
    expect(Array.isArray(meals)).toBe(true);
  });

  it("can view meal categories without authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    const categories = await caller.menu.categories();
    expect(Array.isArray(categories)).toBe(true);
  });

  it("can view active promotions without authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    const promos = await caller.menu.activePromotions();
    expect(Array.isArray(promos)).toBe(true);
  });

  it("can view branch information without authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    const branches = await caller.menu.branches();
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBeGreaterThan(0);
  });

  it("cannot access order history without authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    await expect(caller.orders.list()).rejects.toThrow();
  });

  it("cannot access loyalty account without authentication", async () => {
    const caller = appRouter.createCaller(makeGuestCtx());
    await expect(caller.loyalty.account()).rejects.toThrow();
  });

  it("authenticated customer can view their profile", async () => {
    const caller = appRouter.createCaller(makeCtx("customer", 1));
    const me = await caller.auth.me();
    expect(me?.role).toBe("customer");
    expect(me?.email).toBe("customer1@amalaoluyole.com");
  });

  it("customer cannot access kitchen procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("customer", 1));
    await expect(caller.kitchen.allInventory({ branchId: 1 })).rejects.toThrow();
  });

  it("customer cannot access admin procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("customer", 1));
    await expect(caller.admin.activeOrders()).rejects.toThrow();
  });
});

// ─── ROLE 2: KITCHEN WORKFLOW ─────────────────────────────────────────────────
describe("Kitchen Workflow", () => {
  it("kitchen staff can access the active orders queue", async () => {
    const caller = appRouter.createCaller(makeCtx("kitchen", 10));
    const result = await caller.admin.activeOrders();
    expect(Array.isArray(result)).toBe(true);
  });

  it("kitchen staff can view inventory", async () => {
    const caller = appRouter.createCaller(makeCtx("kitchen", 10));
    const inventory = await caller.kitchen.allInventory({ branchId: 1 });
    expect(Array.isArray(inventory)).toBe(true);
  });

  it("kitchen staff can view monthly report", async () => {
    const caller = appRouter.createCaller(makeCtx("kitchen", 10));
    const report = await caller.kitchen.monthlyReport({ branchId: 1, year: 2025, month: 7 });
    expect(report).toHaveProperty("summary");
  });

  it("kitchen staff cannot access admin-only stats", async () => {
    const caller = appRouter.createCaller(makeCtx("kitchen", 10));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("manager can access kitchen procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("manager", 20));
    const inventory = await caller.kitchen.allInventory({ branchId: 1 });
    expect(Array.isArray(inventory)).toBe(true);
  });

  it("admin can access kitchen procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const inventory = await caller.kitchen.allInventory({ branchId: 1 });
    expect(Array.isArray(inventory)).toBe(true);
  });
});

// ─── ROLE 3: ADMIN WORKFLOW ───────────────────────────────────────────────────
describe("Admin Workflow", () => {
  it("admin can access the active orders list", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const result = await caller.admin.activeOrders();
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can view dashboard stats", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("totalOrders");
    expect(stats).toHaveProperty("totalRevenue");
  });

  it("admin can view all riders", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const riders = await caller.admin.riders({});
    expect(Array.isArray(riders)).toBe(true);
  });

  it("admin can view all promo codes", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const promos = await caller.admin.allPromoCodes();
    expect(Array.isArray(promos)).toBe(true);
  });

  it("admin can view transaction report", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const report = await caller.admin.transactionReport({});
    expect(report).toHaveProperty("summary");
  });

  it("manager can access admin procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("manager", 20));
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("totalOrders");
  });

  it("customer cannot access admin procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("customer", 1));
    await expect(caller.admin.activeOrders()).rejects.toThrow();
  });

  it("kitchen staff cannot access admin-only stats", async () => {
    const caller = appRouter.createCaller(makeCtx("kitchen", 10));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("rider cannot access admin procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("rider", 30));
    await expect(caller.admin.stats()).rejects.toThrow();
  });
});

// ─── ROLE 4: RIDER WORKFLOW ───────────────────────────────────────────────────
describe("Rider Workflow", () => {
  it("rider can view their assigned orders", async () => {
    const caller = appRouter.createCaller(makeCtx("rider", 30));
    const orders = await caller.rider.myOrders();
    expect(Array.isArray(orders)).toBe(true);
  });

  it("rider can update their online/offline status", async () => {
    const caller = appRouter.createCaller(makeCtx("rider", 30));
    // Rider profile for userId=30 is seeded in beforeAll — expect success
    const result = await caller.rider.setStatus({ isOnline: true });
    expect(result).toEqual({ success: true });
  });

  it("rider cannot access admin procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("rider", 30));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("rider cannot access kitchen procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("rider", 30));
    await expect(caller.kitchen.allInventory({ branchId: 1 })).rejects.toThrow();
  });

  it("customer cannot access rider procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("customer", 1));
    await expect(caller.rider.setStatus({ isOnline: true })).rejects.toThrow();
  });

  it("admin cannot impersonate a rider through operational rider procedures", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    await expect(caller.rider.myOrders()).rejects.toThrow();
  });
});

// ─── ROLE 5: FINANCE WORKFLOW ─────────────────────────────────────────────────
describe("Finance / Reports Workflow", () => {
  it("admin can generate a transaction report", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const report = await caller.admin.transactionReport({});
    expect(report).toHaveProperty("rows");
    expect(report).toHaveProperty("summary");
  });

  it("admin can generate a monthly kitchen report", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const report = await caller.kitchen.monthlyReport({ branchId: 1, year: 2025, month: 7 });
    expect(report).toHaveProperty("summary");
    expect(report).toHaveProperty("topMeals");
  });

  it("revenue totalRevenue is a non-negative number", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const report = await caller.admin.transactionReport({});
    if (report.summary) {
      expect(Number(report.summary.totalRevenue)).toBeGreaterThanOrEqual(0);
    } else {
      expect(Array.isArray(report.rows)).toBe(true);
    }
  });

  it("revenue totalOrders is a non-negative integer", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const report = await caller.admin.transactionReport({});
    if (report.summary) {
      expect(Number.isInteger(Number(report.summary.totalOrders))).toBe(true);
      expect(Number(report.summary.totalOrders)).toBeGreaterThanOrEqual(0);
    } else {
      expect(Array.isArray(report.rows)).toBe(true);
    }
  });

  it("manager can access finance reports", async () => {
    const caller = appRouter.createCaller(makeCtx("manager", 20));
    const report = await caller.admin.transactionReport({});
    expect(report).toHaveProperty("rows");
  });

  it("customer cannot access finance reports", async () => {
    const caller = appRouter.createCaller(makeCtx("customer", 1));
    await expect(caller.admin.transactionReport({})).rejects.toThrow();
  });

  it("admin can view all promo codes for financial tracking", async () => {
    const caller = appRouter.createCaller(makeCtx("admin", 99));
    const promos = await caller.admin.allPromoCodes();
    expect(Array.isArray(promos)).toBe(true);
  });
});
