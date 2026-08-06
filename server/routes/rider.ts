import { z } from "zod";
import {
  getOrdersByRider, getRiderByUserId, getRiderCurrentLocation,
  updateOrderStatus, updateRiderLocation, updateRiderStatus,
} from "../db";
import { getDb, sendPushToUser, createNotification } from "../db";
import { sendOrderStatusWhatsApp } from "../notifications";
import { orders, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";

export const riderRouter = router({
  // Customer: get rider location for their active order
  getLocation: protectedProcedure
    .input(z.object({ riderId: z.number() }))
    .query(({ input }) => getRiderCurrentLocation(input.riderId)),

  // Rider: update own location
  updateLocation: protectedProcedure
    .input(z.object({ latitude: z.number(), longitude: z.number(), orderId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const rider = await getRiderByUserId(ctx.user.id);
      if (!rider) throw new Error("Rider profile not found");
      await updateRiderLocation(rider.id, input.latitude, input.longitude, input.orderId);
      return { success: true };
    }),

  // Rider: toggle online/offline status
  setStatus: protectedProcedure
    .input(z.object({ isOnline: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const rider = await getRiderByUserId(ctx.user.id);
      if (!rider) throw new Error("Rider profile not found");
      await updateRiderStatus(rider.id, input.isOnline, input.isOnline);
      return { success: true };
    }),

  // Rider: get assigned orders
  myOrders: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const rider = await getRiderByUserId(ctx.user.id);
      if (!rider) return [];
      return getOrdersByRider(rider.id, input?.status);
    }),

  // Rider: update order status (out_for_delivery, delivered)
  updateOrderStatus: protectedProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.enum(["out_for_delivery", "delivered"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const rider = await getRiderByUserId(ctx.user.id);
      if (!rider) throw new Error("Rider profile not found");
      await updateOrderStatus(input.orderId, input.status, input.note, ctx.user.id);
      // Push notification to customer on rider status update
      const db = await getDb();
      if (db) {
        const orderRow = await db.select({ userId: orders.userId, orderNumber: orders.orderNumber })
          .from(orders).where(eq(orders.id, input.orderId)).limit(1);
        if (orderRow.length > 0 && orderRow[0].userId) {
          const msgs: Record<string, { title: string; body: string }> = {
            out_for_delivery: { title: '🚴 On the Way!', body: `Your order #${orderRow[0].orderNumber} is out for delivery!` },
            delivered: { title: '✅ Order Delivered!', body: `Your order #${orderRow[0].orderNumber} has been delivered. Enjoy your meal! 🍽️` },
          };
          const msg = msgs[input.status];
          if (msg) {
            createNotification({ userId: orderRow[0].userId, type: 'order_update', title: msg.title, body: msg.body, orderId: input.orderId }).catch(() => {});
            sendPushToUser(orderRow[0].userId, msg.title, msg.body, { orderId: input.orderId }).catch(() => {});
            // ── WhatsApp notification ──────────────────────────────────────
            db.select({ phone: users.phone }).from(users).where(eq(users.id, orderRow[0].userId)).limit(1).then(userRow => {
              if (userRow.length > 0 && userRow[0].phone) {
                sendOrderStatusWhatsApp(userRow[0].phone, orderRow[0].orderNumber ?? String(input.orderId), input.status, input.note).catch(() => {});
              }
            }).catch(() => {});
          }
        }
      }
      return { success: true };
    }),
});
