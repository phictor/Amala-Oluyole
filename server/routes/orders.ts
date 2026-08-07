import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { branches, promoCodeUsage, promoCodes } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { createNotification, getDb, getOrderById, getOrderWithItems, getUserOrders, rateOrder, updateOrderStatus } from "../db";
import { placeServerPricedOrder } from "../orders/service";
import { initializeOrderPayment, verifyAndConfirmOrderPayment } from "../payments/service";
import { assertOrderTransition } from "../security/order-state";
import { requireAppIntegrity } from "../security/app-integrity";

const optionSelection = z.object({ id: z.string().min(1).max(32), quantity: z.number().int().min(1).max(20) }).strict();
const itemRequest = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("meal"),
    mealId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(50),
    specialInstructions: z.string().max(500).optional(),
  }).strict(),
  z.object({
    kind: z.literal("custom"),
    quantity: z.number().int().min(1).max(50),
    options: z.object({
      swallowId: z.string().min(1).max(32),
      soupId: z.string().min(1).max(32),
      proteins: z.array(optionSelection).min(1).max(20),
      extras: z.array(optionSelection).max(20).optional(),
    }).strict(),
    specialInstructions: z.string().max(500).optional(),
  }).strict(),
]);

export const ordersRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).default(0) }).optional())
    .query(({ ctx, input }) => getUserOrders(ctx.user.id, input?.limit, input?.offset)),

  get: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const result = await getOrderWithItems(input.id);
    if (!result || result.order.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
    return result;
  }),

  validatePromo: protectedProcedure
    .input(z.object({ code: z.string().trim().min(1).max(32), branchId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Promo service unavailable" });
      const [promo] = await db.select().from(promoCodes).where(and(
        eq(promoCodes.code, input.code.toUpperCase()),
        eq(promoCodes.isActive, true),
      )).limit(1);
      const now = new Date();
      if (!promo || (promo.startsAt && promo.startsAt > now) || (promo.expiresAt && promo.expiresAt < now)) return { valid: false, message: "Invalid promo code" };
      if (promo.usageLimit != null && promo.usageCount >= promo.usageLimit) return { valid: false, message: "Promo code usage limit reached" };
      if ((promo.applicableBranchIds ?? []).length > 0 && !(promo.applicableBranchIds ?? []).includes(input.branchId)) return { valid: false, message: "Promo code is not valid at this branch" };
      const prior = await db.select({ id: promoCodeUsage.id }).from(promoCodeUsage).where(and(
        eq(promoCodeUsage.promoCodeId, promo.id), eq(promoCodeUsage.userId, ctx.user.id),
      ));
      if (prior.length >= promo.perUserLimit) return { valid: false, message: "Promo code per-user limit reached" };
      return { valid: true, message: "Final discount will be calculated securely at checkout" };
    }),

  place: protectedProcedure.input(z.object({
    branchId: z.number().int().positive(),
    orderType: z.enum(["delivery", "pickup"]),
    paymentMethod: z.enum(["card", "cash_on_delivery"]),
    promoCode: z.string().trim().max(32).optional(),
    loyaltyPointsUsed: z.number().int().min(0).default(0),
    deliveryAddress: z.string().trim().max(1_000).optional(),
    deliveryLatitude: z.number().min(-90).max(90).optional(),
    deliveryLongitude: z.number().min(-180).max(180).optional(),
    deliveryInstructions: z.string().max(1_000).optional(),
    customerNotes: z.string().max(1_000).optional(),
    items: z.array(itemRequest).min(1).max(100),
  }).strict()).mutation(async ({ ctx, input }) => {
    await requireAppIntegrity(ctx.req, ctx.user.id, "checkout");
    const order = await placeServerPricedOrder(ctx.user.id, input);
    await createNotification({
      userId: ctx.user.id,
      orderId: order.id,
      type: "order_update",
      title: "Order placed",
      body: `Your order #${order.orderNumber} has been received.`,
      data: { orderId: order.id, orderNumber: order.orderNumber },
    });
    return order;
  }),

  initializePayment: protectedProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await requireAppIntegrity(ctx.req, ctx.user.id, "payment.initialize");
      return initializeOrderPayment(ctx.user.id, input.orderId);
    }),

  verifyPayment: protectedProcedure
    .input(z.object({ orderId: z.number().int().positive(), paymentReference: z.string().min(8).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await requireAppIntegrity(ctx.req, ctx.user.id, "payment.verify");
      const result = await verifyAndConfirmOrderPayment(ctx.user.id, input.orderId, input.paymentReference);
      if (!result.alreadyConfirmed) {
        const order = await getOrderById(input.orderId);
        if (order) await createNotification({
          userId: ctx.user.id,
          orderId: order.id,
          type: "order_update",
          title: "Payment confirmed",
          body: `Payment verified for order #${order.orderNumber}.`,
          data: { orderId: order.id },
        });
      }
      return result;
    }),

  cancel: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), reason: z.string().trim().min(3).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId);
      if (!order || order.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      assertOrderTransition(order.status, "cancelled", "customer");
      await updateOrderStatus(order.id, "cancelled", "customer", input.reason, ctx.user.id);
      return { success: true };
    }),

  rate: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), rating: z.number().int().min(1).max(5), review: z.string().max(2_000).optional() }))
    .mutation(async ({ ctx, input }) => {
      await rateOrder(input.orderId, ctx.user.id, input.rating, input.review);
      return { success: true };
    }),

  validateDeliveryZone: protectedProcedure.input(z.object({
    branchId: z.number().int().positive(), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Delivery validation unavailable" });
    const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
    if (!branch?.isActive || !branch.acceptsDelivery || branch.latitude == null || branch.longitude == null || branch.deliveryRadiusKm == null) {
      return { withinZone: false, reason: "Delivery zone is not configured" };
    }
    const { assessDeliveryZone } = await import("../orders/delivery-zone");
    return assessDeliveryZone(
      { latitude: branch.latitude, longitude: branch.longitude, radiusKm: branch.deliveryRadiusKm },
      { latitude: input.latitude, longitude: input.longitude },
    );
  }),
});
