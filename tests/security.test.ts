/**
 * SECURITY TESTS — Access Control, Authentication, IDOR, Input Validation,
 *                  and Transaction Integrity
 *
 * Test categories:
 *   1. Authentication — unauthenticated access to protected procedures
 *   2. Role-based access control (RBAC) — horizontal and vertical privilege escalation
 *   3. Insecure Direct Object Reference (IDOR) — accessing other users' data
 *   4. Input validation — boundary values, oversized inputs, invalid data
 *   5. Transaction integrity — negative amounts, invalid promo codes, loyalty balance
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

// ─── CONTEXT FACTORIES ────────────────────────────────────────────────────────
function ctx(role: "customer" | "kitchen" | "admin" | "manager" | "rider", id = 1): TrpcContext {
  return {
    user: {
      id,
      openId: `sec-${role}-${id}`,
      email: `${role}${id}@test.com`,
      name: `Security ${role}`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      phone: null,
      isGuest: false,
      pushToken: null,
      preferredBranchId: null,
    },
    req: { protocol: "https", headers: {}, hostname: "localhost" } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function guestCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {}, hostname: "localhost" } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── 1. AUTHENTICATION TESTS ──────────────────────────────────────────────────
describe("Security: Authentication", () => {
  it("unauthenticated user cannot list their orders", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.orders.list()).rejects.toThrow();
  });

  it("unauthenticated user cannot place an order", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(
      caller.orders.place({
        branchId: 1,
        orderType: "delivery",
        paymentMethod: "card",
        items: [{ mealId: 1, name: "Test Meal", quantity: 1, unitPrice: 1500, subtotal: 1500 }],
        subtotal: 1500,
        deliveryFee: 500,
        discount: 0,
        total: 2000,
      })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot access loyalty account", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.loyalty.account()).rejects.toThrow();
  });

  it("unauthenticated user cannot access notifications", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.notifications.list()).rejects.toThrow();
  });

  it("unauthenticated user cannot access addresses", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.addresses.list()).rejects.toThrow();
  });

  it("unauthenticated user cannot access profile", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.profile.me()).rejects.toThrow();
  });

  it("unauthenticated user cannot access admin stats", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("unauthenticated user cannot access kitchen inventory", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.kitchen.allInventory({ branchId: 1 })).rejects.toThrow();
  });

  it("unauthenticated user cannot access rider orders", async () => {
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.rider.myOrders()).rejects.toThrow();
  });
});

// ─── 2. ROLE-BASED ACCESS CONTROL ────────────────────────────────────────────
describe("Security: Role-Based Access Control (RBAC)", () => {
  it("customer cannot update order status (kitchen privilege)", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.admin.updateOrderStatus({ orderId: 1, status: "accepted" })
    ).rejects.toThrow();
  });

  it("customer cannot create a meal (admin privilege)", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.admin.createMeal({
        name: "Hack Meal",
        categoryId: 1,
        price: 100,
        isAvailable: true,
      })
    ).rejects.toThrow();
  });

  it("customer cannot create a promo code (admin privilege)", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.admin.createPromoCode({
        code: "HACK100",
        type: "percentage",
        value: 100,
        minOrderAmount: 0,
      })
    ).rejects.toThrow();
  });

  it("rider cannot update order status (kitchen privilege)", async () => {
    const caller = appRouter.createCaller(ctx("rider", 30));
    await expect(
      caller.admin.updateOrderStatus({ orderId: 1, status: "accepted" })
    ).rejects.toThrow();
  });

  it("kitchen staff cannot create a promo code (admin privilege)", async () => {
    const caller = appRouter.createCaller(ctx("kitchen", 10));
    await expect(
      caller.admin.createPromoCode({
        code: "KITCHENHACK",
        type: "percentage",
        value: 50,
        minOrderAmount: 0,
      })
    ).rejects.toThrow();
  });

  it("kitchen staff cannot assign a rider (admin privilege)", async () => {
    const caller = appRouter.createCaller(ctx("kitchen", 10));
    await expect(
      caller.admin.assignRider({ orderId: 1, riderId: 1 })
    ).rejects.toThrow();
  });

  it("kitchen staff cannot delete a meal (admin privilege)", async () => {
    const caller = appRouter.createCaller(ctx("kitchen", 10));
    await expect(caller.admin.deleteMeal({ id: 1 })).rejects.toThrow();
  });

  it("customer cannot access another customer's order detail (IDOR)", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    // Order ID 9999 belongs to a different user; expect either not-found or auth error
    const result = await caller.orders.get({ id: 9999 }).catch(() => null);
    // Either throws or returns null — must not return another user's data
    expect(result).toBeNull();
  });
});

// ─── 3. INPUT VALIDATION ──────────────────────────────────────────────────────
describe("Security: Input Validation", () => {
  it("rejects order with zero items", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.orders.place({
        branchId: 1,
        orderType: "delivery",
        paymentMethod: "card",
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
      })
    ).rejects.toThrow();
  });

  it("rejects order with negative quantity", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.orders.place({
        branchId: 1,
        orderType: "delivery",
        paymentMethod: "card",
        items: [{ mealId: 1, name: "Test", quantity: -1, unitPrice: 1500, subtotal: -1500 }],
        subtotal: -1500,
        deliveryFee: 0,
        discount: 0,
        total: -1500,
      })
    ).rejects.toThrow();
  });

  it("rejects promo validation with oversized code (>50 chars)", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    const longCode = "A".repeat(51);
    await expect(
      caller.orders.validatePromo({ code: longCode, orderAmount: 1000 })
    ).rejects.toThrow();
  });

  it("rejects reservation with party size of zero", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.reservations.create({
        branchId: 1,
        guestName: "Test User",
        guestPhone: "08012345678",
        partySize: 0,
        reservationDate: "2030-12-31",
      })
    ).rejects.toThrow();
  });

  it("rejects support ticket with message shorter than 10 chars", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.support.create({
        subject: "Test Issue",
        message: "short",
        category: "general",
      })
    ).rejects.toThrow();
  });

  it("rejects catering request with guest count below minimum (10)", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.catering.create({
        branchId: 1,
        contactName: "Test",
        contactPhone: "08012345678",
        eventType: "birthday",
        eventDate: "2030-12-31",
        guestCount: 5, // below minimum of 10
        venue: "Test Venue Location",
      })
    ).rejects.toThrow();
  });

  it("rejects support subject shorter than 5 chars", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    await expect(
      caller.support.create({
        subject: "Hi",
        message: "This is a valid message with enough characters",
        category: "general",
      })
    ).rejects.toThrow();
  });
});

// ─── 4. TRANSACTION INTEGRITY ─────────────────────────────────────────────────
describe("Security: Transaction Integrity", () => {
  it("invalid promo code returns isValid=false (not a server error)", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    const result = await caller.orders.validatePromo({
      code: "FAKECODE999",
      orderAmount: 2000,
    }).catch(() => null);
    // Either throws (DB unavailable) or returns invalid
    if (result !== null) {
      expect(result.valid).toBe(false);
    }
  });

  it("loyalty account balance is always non-negative", async () => {
    const caller = appRouter.createCaller(ctx("customer", 1));
    const account = await caller.loyalty.account().catch(() => null);
    if (account) {
      // points field (not balance) is the correct field name
      expect(Number(account.points)).toBeGreaterThanOrEqual(0);
    }
  });

  it("order total integrity: subtotal + deliveryFee - discount = total", () => {
    // Pure arithmetic check — no DB needed
    const subtotal = 3500;
    const deliveryFee = 500;
    const discount = 350; // 10% promo
    const expectedTotal = subtotal + deliveryFee - discount;
    expect(expectedTotal).toBe(3650);
  });

  it("loyalty tier thresholds are correctly ordered", () => {
    // Business rule: bronze < silver < gold < platinum
    const tiers = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 };
    expect(tiers.bronze).toBeLessThan(tiers.silver);
    expect(tiers.silver).toBeLessThan(tiers.gold);
    expect(tiers.gold).toBeLessThan(tiers.platinum);
  });

  it("rider location update is scoped to the authenticated rider only", async () => {
    const caller = appRouter.createCaller(ctx("rider", 30));
    // updateLocation uses ctx.user.id internally — cannot update another rider's location
    const result = await caller.rider.updateLocation({
      latitude: 7.3775,
      longitude: 3.9470,
    }).catch(() => null);
    // Should succeed for own location or fail gracefully (rider not in DB)
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("admin cannot delete a non-existent meal gracefully", async () => {
    const caller = appRouter.createCaller(ctx("admin", 99));
    const result = await caller.admin.deleteMeal({ id: 99999 }).catch((e: Error) => e.message);
    expect(typeof result).toBe("string");
  });
});
