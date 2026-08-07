import { and, eq, sql } from "drizzle-orm";
import type { InsertOrderItem } from "../../drizzle/schema";
import {
  branches,
  loyaltyAccounts,
  loyaltyTransactions,
  mealBranchAvailability,
  meals,
  orderItems,
  orders,
  orderStatusHistory,
  promoCodeUsage,
  promoCodes,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { calculateOrderTotals, priceCustomMeal, type CustomSelection } from "./pricing";
import { assessDeliveryZone, haversineKm } from "./delivery-zone";

export { haversineKm } from "./delivery-zone";

export type OrderItemRequest =
  | { kind: "meal"; mealId: number; quantity: number; specialInstructions?: string }
  | { kind: "custom"; quantity: number; options: CustomSelection; specialInstructions?: string };

export type PlaceOrderRequest = {
  branchId: number;
  orderType: "delivery" | "pickup";
  paymentMethod: "card" | "cash_on_delivery";
  promoCode?: string;
  loyaltyPointsUsed?: number;
  deliveryAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryInstructions?: string;
  customerNotes?: string;
  items: OrderItemRequest[];
};

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function generateOrderNumber(): string {
  return `AO${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`.toUpperCase().slice(0, 20);
}

export async function placeServerPricedOrder(userId: number, input: PlaceOrderRequest) {
  const db = await getDb();
  if (!db) throw new Error("Order service unavailable");
  if (input.items.length === 0) throw new Error("At least one item is required");

  return db.transaction(async (tx) => {
    const [branch] = await tx.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
    if (!branch?.isActive) throw new Error("Branch is unavailable");
    if (input.orderType === "delivery" && !branch.acceptsDelivery) throw new Error("Branch does not accept delivery orders");
    if (input.orderType === "pickup" && !branch.acceptsPickup) throw new Error("Branch does not accept pickup orders");

    if (input.orderType === "delivery") {
      if (!input.deliveryAddress?.trim() || input.deliveryLatitude == null || input.deliveryLongitude == null) {
        throw new Error("Verified delivery location is required");
      }
      const zone = assessDeliveryZone(
        { latitude: branch.latitude, longitude: branch.longitude, radiusKm: branch.deliveryRadiusKm },
        { latitude: input.deliveryLatitude, longitude: input.deliveryLongitude },
      );
      if (!zone.withinZone) throw new Error("reason" in zone ? zone.reason : "Delivery address is outside this branch's delivery zone");
    }

    const pricedItems: Array<Omit<InsertOrderItem, "orderId">> = [];
    for (const requested of input.items) {
      if (!Number.isInteger(requested.quantity) || requested.quantity < 1 || requested.quantity > 50) {
        throw new Error("Invalid item quantity");
      }
      if (requested.kind === "meal") {
        const [meal] = await tx.select().from(meals).where(eq(meals.id, requested.mealId)).limit(1);
        if (!meal?.isAvailable) throw new Error("Meal is unavailable");
        await tx.execute(sql`SELECT id FROM meal_branch_availability WHERE mealId = ${meal.id} AND branchId = ${input.branchId} FOR UPDATE`);
        const [availability] = await tx.select().from(mealBranchAvailability).where(and(
          eq(mealBranchAvailability.mealId, meal.id),
          eq(mealBranchAvailability.branchId, input.branchId),
        )).limit(1);
        if (!availability?.isAvailable || (availability.stockCount != null && availability.stockCount < requested.quantity)) {
          throw new Error("Meal is unavailable at the selected branch");
        }
        const unitPrice = Number(meal.price);
        pricedItems.push({
          mealId: meal.id,
          isCustomMeal: false,
          customMealConfig: null,
          name: meal.name,
          unitPrice: unitPrice.toFixed(2),
          quantity: requested.quantity,
          subtotal: money(unitPrice * requested.quantity).toFixed(2),
          specialInstructions: requested.specialInstructions?.trim() || null,
        });
        if (availability.stockCount != null) {
          await tx.update(mealBranchAvailability).set({
            stockCount: sql`${mealBranchAvailability.stockCount} - ${requested.quantity}`,
            updatedAt: new Date(),
          }).where(eq(mealBranchAvailability.id, availability.id));
        }
      } else {
        const custom = priceCustomMeal(requested.options);
        pricedItems.push({
          mealId: null,
          isCustomMeal: true,
          customMealConfig: custom.config,
          name: custom.name,
          unitPrice: custom.unitPrice.toFixed(2),
          quantity: requested.quantity,
          subtotal: money(custom.unitPrice * requested.quantity).toFixed(2),
          specialInstructions: requested.specialInstructions?.trim() || null,
        });
      }
    }

    const subtotal = money(pricedItems.reduce((sum, item) => sum + Number(item.subtotal), 0));
    if (subtotal < Number(branch.minOrderAmount ?? 0)) throw new Error("Order does not meet the branch minimum");

    let promo: typeof promoCodes.$inferSelect | undefined;
    let discount = 0;
    let deliveryFee = input.orderType === "delivery" ? Number(branch.deliveryFeeBase ?? 0) : 0;
    if (input.promoCode?.trim()) {
      const code = input.promoCode.trim().toUpperCase();
      [promo] = await tx.select().from(promoCodes).where(and(eq(promoCodes.code, code), eq(promoCodes.isActive, true))).limit(1);
      if (!promo) throw new Error("Invalid promo code");
      await tx.execute(sql`SELECT id FROM promo_codes WHERE id = ${promo.id} FOR UPDATE`);
      [promo] = await tx.select().from(promoCodes).where(eq(promoCodes.id, promo.id)).limit(1);
      if (!promo?.isActive) throw new Error("Invalid promo code");
      const now = new Date();
      if ((promo.startsAt && promo.startsAt > now) || (promo.expiresAt && promo.expiresAt < now)) throw new Error("Promo code is not active");
      if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) throw new Error("Promo code usage limit reached");
      if (subtotal < Number(promo.minOrderAmount ?? 0)) throw new Error("Promo minimum order amount not met");
      const branchIds = promo.applicableBranchIds ?? [];
      if (branchIds.length > 0 && !branchIds.includes(input.branchId)) throw new Error("Promo code is not valid at this branch");
      const prior = await tx.select({ id: promoCodeUsage.id }).from(promoCodeUsage).where(and(
        eq(promoCodeUsage.promoCodeId, promo.id),
        eq(promoCodeUsage.userId, userId),
      ));
      if (prior.length >= promo.perUserLimit) throw new Error("Promo code per-user limit reached");
      if (promo.type === "percentage") discount = subtotal * (Number(promo.value) / 100);
      else if (promo.type === "fixed") discount = Number(promo.value);
      else if (promo.type === "free_delivery") deliveryFee = 0;
      else throw new Error("Unsupported promo type");
      if (promo.maxDiscount != null) discount = Math.min(discount, Number(promo.maxDiscount));
    }

    const requestedPoints = Math.max(0, Math.floor(input.loyaltyPointsUsed ?? 0));
    if (requestedPoints > 0) {
      await tx.execute(sql`SELECT id FROM loyalty_accounts WHERE userId = ${userId} FOR UPDATE`);
    }
    const [loyalty] = await tx.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.userId, userId)).limit(1);
    if (requestedPoints > 0) {
      if (!loyalty || loyalty.points < requestedPoints) throw new Error("Insufficient loyalty balance");
    }

    const totals = calculateOrderTotals({ subtotal, deliveryFee, discount, loyaltyPointsUsed: requestedPoints });
    if (totals.total <= 0) throw new Error("Invalid final order total");
    const status = input.paymentMethod === "cash_on_delivery" ? "created" : "awaiting_payment";
    const [inserted] = await tx.insert(orders).values({
      orderNumber: generateOrderNumber(),
      userId,
      branchId: input.branchId,
      orderType: input.orderType,
      paymentMethod: input.paymentMethod,
      paymentStatus: "pending",
      status,
      subtotal: totals.subtotal.toFixed(2),
      serviceFee: totals.serviceFee.toFixed(2),
      deliveryFee: totals.deliveryFee.toFixed(2),
      discount: totals.discount.toFixed(2),
      loyaltyPointsUsed: totals.loyaltyPointsUsed,
      total: totals.total.toFixed(2),
      promoCode: promo?.code ?? null,
      deliveryAddress: input.orderType === "delivery" ? input.deliveryAddress!.trim() : null,
      deliveryLatitude: input.orderType === "delivery" ? input.deliveryLatitude : null,
      deliveryLongitude: input.orderType === "delivery" ? input.deliveryLongitude : null,
      deliveryInstructions: input.deliveryInstructions?.trim() || null,
      customerNotes: input.customerNotes?.trim() || null,
    }).$returningId();
    const orderId = inserted.id;
    await tx.insert(orderItems).values(pricedItems.map((item) => ({ ...item, orderId })));
    await tx.insert(orderStatusHistory).values({ orderId, status, note: "Order placed", changedBy: userId });

    if (promo) {
      await tx.insert(promoCodeUsage).values({
        promoCodeId: promo.id,
        userId,
        orderId,
        discountApplied: totals.discount.toFixed(2),
      });
      await tx.update(promoCodes).set({ usageCount: sql`${promoCodes.usageCount} + 1` }).where(eq(promoCodes.id, promo.id));
    }
    if (requestedPoints > 0) {
      await tx.update(loyaltyAccounts).set({
        points: sql`${loyaltyAccounts.points} - ${requestedPoints}`,
        totalPointsRedeemed: sql`${loyaltyAccounts.totalPointsRedeemed} + ${requestedPoints}`,
      }).where(eq(loyaltyAccounts.userId, userId));
      await tx.insert(loyaltyTransactions).values({
        userId,
        orderId,
        type: "redeemed",
        points: -requestedPoints,
        description: `Redeemed points for order #${orderId}`,
        idempotencyKey: `order:${orderId}:redeemed`,
      });
    }
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    return order;
  });
}
