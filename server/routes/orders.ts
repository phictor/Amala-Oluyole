import { z } from "zod";
import {
  awardLoyaltyPoints, cancelOrder, createNotification, createOrder,
  getOrderById, getOrderWithItems, getUserOrders, rateOrder,
  updateOrderStatus, validatePromoCode,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

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
});
