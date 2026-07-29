/**
 * UNIT TESTS — Calculations, Validation Rules, and Service Functions
 * Tests pure business logic without DB or network dependencies.
 */
import { describe, expect, it } from "vitest";

// ─── 1. Order Total Calculation ───────────────────────────────────────────────
describe("Order Total Calculation", () => {
  function calcTotal(subtotal: number, deliveryFee: number, discount: number, loyaltyPointsUsed: number): number {
    // 1 loyalty point = ₦1 in value
    return Math.max(0, subtotal + deliveryFee - discount - loyaltyPointsUsed);
  }

  it("calculates total correctly with no discount or delivery fee", () => {
    expect(calcTotal(3500, 0, 0, 0)).toBe(3500);
  });

  it("applies delivery fee correctly", () => {
    expect(calcTotal(3500, 500, 0, 0)).toBe(4000);
  });

  it("applies percentage discount correctly", () => {
    // 10% off ₦3500 = ₦350 discount
    const discount = Math.floor(3500 * 0.10);
    expect(calcTotal(3500, 0, discount, 0)).toBe(3150);
  });

  it("applies loyalty points as currency (1 point = ₦1)", () => {
    expect(calcTotal(3500, 0, 0, 200)).toBe(3300);
  });

  it("total never goes below zero", () => {
    expect(calcTotal(100, 0, 500, 0)).toBe(0);
  });

  it("stacks delivery fee, discount, and loyalty points", () => {
    expect(calcTotal(5000, 500, 250, 100)).toBe(5150);
  });
});

// ─── 2. Loyalty Points Calculation ───────────────────────────────────────────
describe("Loyalty Points Calculation", () => {
  function calcPoints(orderTotal: number): number {
    return Math.floor(orderTotal / 100); // 1 point per ₦100
  }

  it("awards 1 point per ₦100 spent", () => {
    expect(calcPoints(1000)).toBe(10);
  });

  it("floors partial points (₦150 = 1 point)", () => {
    expect(calcPoints(150)).toBe(1);
  });

  it("awards 0 points for orders under ₦100", () => {
    expect(calcPoints(99)).toBe(0);
  });

  it("awards correct points for large orders", () => {
    expect(calcPoints(25000)).toBe(250);
  });

  function calcTier(totalEarned: number): string {
    if (totalEarned >= 10000) return "platinum";
    if (totalEarned >= 5000) return "gold";
    if (totalEarned >= 1000) return "silver";
    return "bronze";
  }

  it("assigns bronze tier for < 1000 total points", () => {
    expect(calcTier(0)).toBe("bronze");
    expect(calcTier(999)).toBe("bronze");
  });

  it("assigns silver tier for 1000–4999 total points", () => {
    expect(calcTier(1000)).toBe("silver");
    expect(calcTier(4999)).toBe("silver");
  });

  it("assigns gold tier for 5000–9999 total points", () => {
    expect(calcTier(5000)).toBe("gold");
    expect(calcTier(9999)).toBe("gold");
  });

  it("assigns platinum tier for >= 10000 total points", () => {
    expect(calcTier(10000)).toBe("platinum");
    expect(calcTier(99999)).toBe("platinum");
  });
});

// ─── 3. Promo Code Validation Rules ──────────────────────────────────────────
describe("Promo Code Validation Rules", () => {
  interface PromoRule {
    type: "percentage" | "fixed" | "free_delivery";
    value: number;
    maxDiscount?: number;
    minOrderAmount?: number;
    usageLimit?: number;
    usageCount: number;
    perUserLimit: number;
    userUsageCount: number;
    expiresAt?: Date;
    startsAt?: Date;
    isActive: boolean;
  }

  function validatePromo(promo: PromoRule, orderAmount: number, now = new Date()): { valid: boolean; discount: number; message?: string } {
    if (!promo.isActive) return { valid: false, discount: 0, message: "Promo code is inactive" };
    if (promo.expiresAt && promo.expiresAt < now) return { valid: false, discount: 0, message: "Promo code has expired" };
    if (promo.startsAt && promo.startsAt > now) return { valid: false, discount: 0, message: "Promo code is not yet active" };
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) return { valid: false, discount: 0, message: "Promo code usage limit reached" };
    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) return { valid: false, discount: 0, message: `Minimum order amount is ₦${promo.minOrderAmount}` };
    if (promo.userUsageCount >= promo.perUserLimit) return { valid: false, discount: 0, message: "You have already used this promo code" };
    let discount = 0;
    if (promo.type === "percentage") {
      discount = orderAmount * (promo.value / 100);
      if (promo.maxDiscount) discount = Math.min(discount, promo.maxDiscount);
    } else if (promo.type === "fixed") {
      discount = Math.min(promo.value, orderAmount);
    } else if (promo.type === "free_delivery") {
      discount = 0; // handled separately as deliveryFee waiver
    }
    return { valid: true, discount };
  }

  const basePromo: PromoRule = {
    type: "percentage", value: 10, maxDiscount: 500,
    usageLimit: 100, usageCount: 0, perUserLimit: 1, userUsageCount: 0,
    isActive: true,
  };

  it("applies 10% discount correctly", () => {
    const result = validatePromo(basePromo, 3000);
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(300);
  });

  it("caps percentage discount at maxDiscount", () => {
    const result = validatePromo(basePromo, 10000); // 10% of 10000 = 1000, capped at 500
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(500);
  });

  it("rejects expired promo code", () => {
    const promo = { ...basePromo, expiresAt: new Date("2020-01-01") };
    expect(validatePromo(promo, 3000).valid).toBe(false);
  });

  it("rejects promo not yet started", () => {
    const promo = { ...basePromo, startsAt: new Date("2099-01-01") };
    expect(validatePromo(promo, 3000).valid).toBe(false);
  });

  it("rejects when usage limit reached", () => {
    const promo = { ...basePromo, usageLimit: 10, usageCount: 10 };
    expect(validatePromo(promo, 3000).valid).toBe(false);
  });

  it("rejects when minimum order amount not met", () => {
    const promo = { ...basePromo, minOrderAmount: 5000 };
    expect(validatePromo(promo, 3000).valid).toBe(false);
  });

  it("rejects when user has already used the code", () => {
    const promo = { ...basePromo, perUserLimit: 1, userUsageCount: 1 };
    expect(validatePromo(promo, 3000).valid).toBe(false);
  });

  it("applies fixed discount correctly", () => {
    const promo = { ...basePromo, type: "fixed" as const, value: 200 };
    const result = validatePromo(promo, 3000);
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(200);
  });

  it("fixed discount cannot exceed order amount", () => {
    const promo = { ...basePromo, type: "fixed" as const, value: 5000 };
    const result = validatePromo(promo, 1000);
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(1000);
  });
});

// ─── 4. Order Status Transition Validation ───────────────────────────────────
describe("Order Status Transition Validation", () => {
  type OrderStatus = "awaiting_payment" | "payment_confirmed" | "accepted" | "preparing" | "ready" | "rider_assigned" | "out_for_delivery" | "delivered" | "cancelled";

  const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    awaiting_payment: ["payment_confirmed", "cancelled"],
    payment_confirmed: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready"],
    ready: ["rider_assigned", "delivered"],
    rider_assigned: ["out_for_delivery"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  function canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  it("allows payment_confirmed → accepted", () => expect(canTransition("payment_confirmed", "accepted")).toBe(true));
  it("allows accepted → preparing", () => expect(canTransition("accepted", "preparing")).toBe(true));
  it("allows preparing → ready", () => expect(canTransition("preparing", "ready")).toBe(true));
  it("allows ready → rider_assigned", () => expect(canTransition("ready", "rider_assigned")).toBe(true));
  it("allows rider_assigned → out_for_delivery", () => expect(canTransition("rider_assigned", "out_for_delivery")).toBe(true));
  it("allows out_for_delivery → delivered", () => expect(canTransition("out_for_delivery", "delivered")).toBe(true));
  it("blocks skipping from accepted → delivered", () => expect(canTransition("accepted", "delivered")).toBe(false));
  it("blocks going backwards from preparing → payment_confirmed", () => expect(canTransition("preparing", "payment_confirmed")).toBe(false));
  it("blocks transitions from delivered (terminal state)", () => expect(canTransition("delivered", "cancelled")).toBe(false));
  it("allows cancellation from payment_confirmed", () => expect(canTransition("payment_confirmed", "cancelled")).toBe(true));
  it("blocks cancellation from preparing (already in kitchen)", () => expect(canTransition("preparing", "cancelled")).toBe(false));
});

// ─── 5. Input Validation Rules ───────────────────────────────────────────────
describe("Input Validation Rules", () => {
  function isValidPhone(phone: string): boolean {
    return /^(\+234|0)[789][01]\d{8}$/.test(phone);
  }

  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidOrderQuantity(qty: number): boolean {
    return Number.isInteger(qty) && qty >= 1 && qty <= 50;
  }

  it("accepts valid Nigerian phone number (0XX format)", () => {
    expect(isValidPhone("08012345678")).toBe(true);
  });

  it("accepts valid Nigerian phone number (+234 format)", () => {
    expect(isValidPhone("+2348012345678")).toBe(true);
  });

  it("rejects invalid phone number", () => {
    expect(isValidPhone("1234567890")).toBe(false);
    expect(isValidPhone("0612345678")).toBe(false);
  });

  it("accepts valid email address", () => {
    expect(isValidEmail("customer@gmail.com")).toBe(true);
  });

  it("rejects invalid email address", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@domain.com")).toBe(false);
  });

  it("accepts valid order quantity (1–50)", () => {
    expect(isValidOrderQuantity(1)).toBe(true);
    expect(isValidOrderQuantity(50)).toBe(true);
  });

  it("rejects zero or negative quantity", () => {
    expect(isValidOrderQuantity(0)).toBe(false);
    expect(isValidOrderQuantity(-1)).toBe(false);
  });

  it("rejects quantity over 50", () => {
    expect(isValidOrderQuantity(51)).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    expect(isValidOrderQuantity(1.5)).toBe(false);
  });
});

