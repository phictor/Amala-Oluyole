import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";
import { isApprovedOrigin } from "../server/_core/http-security";
import { productionConfigurationErrors } from "../server/_core/env";
import { assessDeliveryZone } from "../server/orders/delivery-zone";
import { calculateOrderTotals, priceCustomMeal } from "../server/orders/pricing";
import { validatePaystackTransaction, type PaystackTransaction } from "../server/payments/paystack";
import { canTransitionOrder } from "../server/security/order-state";
import { isAllowedOAuthRedirect } from "../server/security/oauth-state";

function customerContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "security-customer-7",
      email: "customer7@example.test",
      name: "Security Customer",
      loginMethod: "test",
      role: "customer",
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

describe("server-authoritative order pricing", () => {
  it("prices custom meals from stable server catalog IDs", () => {
    const priced = priceCustomMeal({
      swallowId: "sw4",
      soupId: "so3",
      proteins: [{ id: "pr1", quantity: 2 }],
      extras: [{ id: "ex8", quantity: 1 }],
    });
    expect(priced.unitPrice).toBe(2_950);
    expect(priced.config.proteins).toEqual([{ id: "pr1", name: "Beef", quantity: 2 }]);
  });

  it("rejects unknown or unavailable custom options", () => {
    expect(() => priceCustomMeal({ swallowId: "sw6", soupId: "so1", proteins: [{ id: "pr1", quantity: 1 }] })).toThrow(/unavailable/);
    expect(() => priceCustomMeal({ swallowId: "sw1", soupId: "so1", proteins: [{ id: "attacker-price", quantity: 1 }] })).toThrow(/Unknown/);
  });

  it("calculates fees and clamps malicious negative adjustments", () => {
    expect(calculateOrderTotals({ subtotal: 2_000, deliveryFee: 500, discount: -999, loyaltyPointsUsed: -50 }))
      .toEqual({ subtotal: 2_000, serviceFee: 100, deliveryFee: 500, discount: 0, loyaltyPointsUsed: 0, total: 2_600 });
  });

  it("rejects client-supplied price and total fields at the API boundary", async () => {
    const caller = appRouter.createCaller(customerContext());
    await expect(caller.orders.place({
      branchId: 1,
      orderType: "pickup",
      paymentMethod: "cash_on_delivery",
      items: [{ kind: "meal", mealId: 1, quantity: 1, unitPrice: 1 }],
      total: 1,
      discount: 999_999,
    } as never)).rejects.toThrow();
  });
});

describe("verified and idempotent payment boundary", () => {
  const expected = { reference: "AO-42-server-ref", amountKobo: 250_000, orderId: 42, userId: 7, appId: "amala-app" };
  const transaction: PaystackTransaction = {
    status: "success",
    reference: expected.reference,
    amount: expected.amountKobo,
    currency: "NGN",
    metadata: { orderId: expected.orderId, userId: expected.userId, appId: expected.appId },
  };

  it("accepts only an exact Paystack reference, amount, currency, and metadata tuple", () => {
    expect(() => validatePaystackTransaction(transaction, expected)).not.toThrow();
    expect(() => validatePaystackTransaction({ ...transaction, amount: 1 }, expected)).toThrow(/amount/);
    expect(() => validatePaystackTransaction({ ...transaction, currency: "USD" }, expected)).toThrow(/currency/);
    expect(() => validatePaystackTransaction({ ...transaction, reference: "replayed-other-order" }, expected)).toThrow(/reference/);
    expect(() => validatePaystackTransaction({ ...transaction, metadata: { ...transaction.metadata, orderId: 43 } }, expected)).toThrow(/metadata/);
  });

  it("does not expose the former client-confirmable payment mutation", () => {
    expect((appRouter._def as unknown as { procedures: Record<string, unknown> }).procedures["orders.confirmPayment"]).toBeUndefined();
  });
});

describe("authorization and fail-closed boundaries", () => {
  it("rejects invalid or actor-forbidden order state transitions", () => {
    expect(canTransitionOrder("rider_assigned", "out_for_delivery", "rider")).toBe(true);
    expect(canTransitionOrder("preparing", "delivered", "rider")).toBe(false);
    expect(canTransitionOrder("completed", "accepted", "admin")).toBe(false);
    expect(canTransitionOrder("created", "payment_confirmed", "system")).toBe(false);
    expect(canTransitionOrder("out_for_delivery", "cancelled", "customer")).toBe(false);
  });

  it("fails delivery validation closed when branch evidence is missing", () => {
    expect(assessDeliveryZone({ latitude: null, longitude: null, radiusKm: null }, { latitude: 7.37, longitude: 3.94 }))
      .toEqual({ withinZone: false, reason: "Delivery zone is not configured" });
  });

  it("permits only exact OAuth callback shapes", () => {
    expect(isAllowedOAuthRedirect("manusapp://oauth/callback")).toBe(true);
    expect(isAllowedOAuthRedirect("amalaoluyole://oauth/callback")).toBe(true);
    expect(isAllowedOAuthRedirect("manusapp://oauth/callback/extra")).toBe(false);
    expect(isAllowedOAuthRedirect("https://evil.example/oauth/callback")).toBe(false);
  });

  it("does not approve arbitrary CORS origins", () => {
    expect(isApprovedOrigin("https://evil.example")).toBe(false);
  });

  it("fails production startup for placeholders and accepts explicit strong configuration", () => {
    expect(productionConfigurationErrors({ NODE_ENV: "production", JWT_SECRET: "changeme" })).not.toHaveLength(0);
    expect(productionConfigurationErrors({
      NODE_ENV: "production",
      VITE_APP_ID: "amala-production",
      JWT_SECRET: "9f2b7c4a8d1e6f3b0c5a9d2e7f4b8c1a",
      DATABASE_URL: "mysql://service:strong-password@db.internal:3306/amala",
      PAYSTACK_SECRET_KEY: "sk_prod_9f2b7c4a8d1e6f3b0c5a9d2e7f4b8c1a",
      OAUTH_SERVER_URL: "https://identity.example.test",
      ALLOWED_ORIGINS: "https://amalaoluyole.com",
      PLAY_INTEGRITY_VERIFIER_URL: "https://integrity.example.test/play",
      PLAY_INTEGRITY_VERIFIER_TOKEN: "9f2b7c4a8d1e6f3b0c5a9d2e7f4b8c1a",
      APPLE_APP_ATTEST_VERIFIER_URL: "https://integrity.example.test/apple",
      APPLE_APP_ATTEST_VERIFIER_TOKEN: "1a8c4b7f2e9d5a0c3b6f8e1d4a7c9b2f",
    })).toEqual([]);
  });
});
