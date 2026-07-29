import { z } from "zod";
import {
  awardLoyaltyPoints, cancelOrder, createNotification, createOrder,
  getOrderById, getOrderWithItems, getUserOrders, rateOrder,
  updateOrderStatus, validatePromoCode,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import https from "https";
import { getDb } from "../db";
import { branches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Call Paystack /transaction/verify/:reference and return the parsed body */
async function paystackVerify(reference: string, secretKey: string): Promise<{ status: boolean; data?: { status: string; amount: number; currency: string } }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.paystack.co",
        path: `/transaction/verify/${encodeURIComponent(reference)}`,
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try { resolve(JSON.parse(body)); } catch { reject(new Error("Invalid Paystack response")); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export const ordersRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }).optional())
    .query(({ ctx, input }) => getUserOrders(ctx.user.id, input?.limit, input?.offset)),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const result = await getOrderWithItems(input.id);
      if (!result || result.order.userId !== ctx.user.id) throw new Error("Order not found");
      return result;
    }),

  validatePromo: protectedProcedure
    .input(z.object({ code: z.string(), orderAmount: z.number() }))
    .mutation(({ ctx, input }) => validatePromoCode(input.code, ctx.user.id, input.orderAmount)),

  place: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      orderType: z.enum(["delivery", "pickup"]),
      paymentMethod: z.enum(["card", "transfer", "cash_on_delivery", "wallet", "loyalty_points"]),
      subtotal: z.number(),
      deliveryFee: z.number().default(0),
      discount: z.number().default(0),
      loyaltyPointsUsed: z.number().default(0),
      total: z.number(),
      promoCode: z.string().optional(),
      deliveryAddress: z.string().optional(),
      deliveryLatitude: z.number().optional(),
      deliveryLongitude: z.number().optional(),
      deliveryInstructions: z.string().optional(),
      customerNotes: z.string().optional(),
      estimatedDeliveryTime: z.number().optional(),
      items: z.array(z.object({
        mealId: z.number().optional(),
        isCustomMeal: z.boolean().default(false),
        customMealConfig: z.object({
          swallow: z.string().optional(),
          soup: z.string().optional(),
          proteins: z.array(z.string()).optional(),
          extras: z.array(z.string()).optional(),
        }).optional(),
        name: z.string(),
        unitPrice: z.number(),
        quantity: z.number(),
        subtotal: z.number(),
        specialInstructions: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
    const { items, ...orderData } = input;
    const order = await createOrder(
      {
        ...orderData,
        userId: ctx.user.id,
        subtotal: String(orderData.subtotal),
        deliveryFee: String(orderData.deliveryFee),
        discount: String(orderData.discount),
        total: String(orderData.total),
        status: "awaiting_payment",
        paymentStatus: "pending",
      },
      items.map((item) => ({
        ...item,
        mealId: item.mealId || null,
        unitPrice: String(item.unitPrice),
        subtotal: String(item.subtotal),
        specialInstructions: item.specialInstructions || null,
        customMealConfig: item.customMealConfig || null,
        orderId: 0, // will be overwritten in createOrder
      })),
    );
      await createNotification({
        userId: ctx.user.id,
        orderId: order.id,
        type: "order_update",
        title: "Order Placed! 🎉",
        body: `Your order #${order.orderNumber} has been placed. We'll confirm it shortly.`,
        data: { orderId: order.id, orderNumber: order.orderNumber },
      });
      return order;
    }),

  /** FR-041: Server-side Paystack verification before confirming payment */
  verifyPayment: protectedProcedure
    .input(z.object({ orderId: z.number(), paymentReference: z.string(), expectedAmount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId);
      if (!order || order.userId !== ctx.user.id) throw new Error("Order not found");
      if (order.paymentStatus === "paid") return { success: true, alreadyConfirmed: true };

      const secretKey = process.env.PAYSTACK_SECRET_KEY ?? "";
      if (!secretKey) throw new Error("Paystack secret key not configured on server");

      const result = await paystackVerify(input.paymentReference, secretKey);
      if (!result.status || result.data?.status !== "success") {
        throw new Error(`Payment verification failed: ${result.data?.status ?? "unknown"}`);
      }

      // Verify amount matches (Paystack amounts are in kobo)
      const paidKobo = result.data.amount;
      const expectedKobo = Math.round(input.expectedAmount * 100);
      if (paidKobo < expectedKobo) {
        throw new Error(`Amount mismatch: paid ₦${paidKobo / 100} but expected ₦${input.expectedAmount}`);
      }

      // Store the verified reference on the order
      await updateOrderStatus(input.orderId, "payment_confirmed", "Payment verified via Paystack");
      await awardLoyaltyPoints(ctx.user.id, input.orderId, Number(order.total));
      await createNotification({
        userId: ctx.user.id,
        orderId: input.orderId,
        type: "order_update",
        title: "Payment Confirmed ✅",
        body: `Payment verified for order #${order.orderNumber}. Your food is being prepared!`,
        data: { orderId: order.id },
      });
      return { success: true, alreadyConfirmed: false };
    }),

  confirmPayment: protectedProcedure
    .input(z.object({ orderId: z.number(), paymentReference: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await getOrderById(input.orderId);
      if (!order || order.userId !== ctx.user.id) throw new Error("Order not found");
      await updateOrderStatus(input.orderId, "payment_confirmed", "Payment confirmed");
      // Award loyalty points
      await awardLoyaltyPoints(ctx.user.id, input.orderId, Number(order.total));
      await createNotification({
        userId: ctx.user.id,
        orderId: input.orderId,
        type: "order_update",
        title: "Payment Confirmed ✅",
        body: `Payment received for order #${order.orderNumber}. Your food is being prepared!`,
        data: { orderId: order.id },
      });
      return { success: true };
    }),

  cancel: protectedProcedure
    .input(z.object({ orderId: z.number(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await cancelOrder(input.orderId, ctx.user.id, input.reason);
      return { success: true };
    }),

  rate: protectedProcedure
    .input(z.object({ orderId: z.number(), rating: z.number().min(1).max(5), review: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await rateOrder(input.orderId, ctx.user.id, input.rating, input.review);
      return { success: true };
    }),

  validateDeliveryZone: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      latitude: z.number(),
      longitude: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { withinZone: true, distanceKm: 0, radiusKm: 10 };
      const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
      if (!branch || branch.latitude == null || branch.longitude == null) {
        // No coordinates configured — allow by default
        return { withinZone: true, distanceKm: 0, radiusKm: branch?.deliveryRadiusKm ?? 10 };
      }
      const distanceKm = haversineKm(branch.latitude, branch.longitude, input.latitude, input.longitude);
      const radiusKm = branch.deliveryRadiusKm ?? 10;
      return { withinZone: distanceKm <= radiusKm, distanceKm: Math.round(distanceKm * 10) / 10, radiusKm };
    }),
});
