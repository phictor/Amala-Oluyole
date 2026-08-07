import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { orders, riders, users } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createNotification,
  getDb,
  getOrdersByRider,
  getRiderByUserId,
  sendPushToUser,
  updateOrderStatus,
  updateRiderLocation,
  updateRiderStatus,
} from "../db";
import { sendOrderStatusWhatsApp } from "../notifications";
import { assertOrderTransition, CUSTOMER_TRACKABLE_STATUSES } from "../security/order-state";
import { requireAppIntegrity } from "../security/app-integrity";

function requireRiderRole(role: string) {
  if (role !== "rider") throw new TRPCError({ code: "FORBIDDEN", message: "Rider access required" });
}

export const riderRouter = router({
  getLocation: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Location service unavailable" });
    const [order] = await db.select({
      id: orders.id,
      userId: orders.userId,
      riderId: orders.riderId,
      orderType: orders.orderType,
      status: orders.status,
    }).from(orders).where(and(eq(orders.id, input.orderId), eq(orders.userId, ctx.user.id))).limit(1);
    if (!order || order.orderType !== "delivery" || !order.riderId || !CUSTOMER_TRACKABLE_STATUSES.includes(order.status)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Active delivery tracking is unavailable" });
    }
    const [rider] = await db.select({
      latitude: riders.currentLatitude,
      longitude: riders.currentLongitude,
      lastUpdate: riders.lastLocationUpdate,
    }).from(riders).where(and(eq(riders.id, order.riderId), eq(riders.isActive, true))).limit(1);
    return rider ?? null;
  }),

  updateLocation: protectedProcedure.input(z.object({
    orderId: z.number().int().positive(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  })).mutation(async ({ ctx, input }) => {
    await requireAppIntegrity(ctx.req, ctx.user.id, "rider.location");
    requireRiderRole(ctx.user.role);
    const rider = await getRiderByUserId(ctx.user.id);
    if (!rider?.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Active rider profile required" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Location service unavailable" });
    const [order] = await db.select({ id: orders.id, status: orders.status }).from(orders).where(and(
      eq(orders.id, input.orderId), eq(orders.riderId, rider.id), eq(orders.orderType, "delivery"),
    )).limit(1);
    if (!order || !CUSTOMER_TRACKABLE_STATUSES.includes(order.status)) throw new TRPCError({ code: "FORBIDDEN", message: "Order is not assigned for active delivery" });
    await updateRiderLocation(rider.id, input.latitude, input.longitude, order.id);
    return { success: true };
  }),

  setStatus: protectedProcedure.input(z.object({ isOnline: z.boolean() })).mutation(async ({ ctx, input }) => {
    await requireAppIntegrity(ctx.req, ctx.user.id, "rider.location");
    requireRiderRole(ctx.user.role);
    const rider = await getRiderByUserId(ctx.user.id);
    if (!rider?.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Active rider profile required" });
    await updateRiderStatus(rider.id, input.isOnline, input.isOnline);
    return { success: true };
  }),

  myOrders: protectedProcedure.input(z.object({ status: z.string().optional() }).optional()).query(async ({ ctx, input }) => {
    requireRiderRole(ctx.user.role);
    const rider = await getRiderByUserId(ctx.user.id);
    if (!rider?.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Active rider profile required" });
    return getOrdersByRider(rider.id, input?.status);
  }),

  updateOrderStatus: protectedProcedure.input(z.object({
    orderId: z.number().int().positive(),
    status: z.enum(["out_for_delivery", "delivered"]),
    note: z.string().max(500).optional(),
  })).mutation(async ({ ctx, input }) => {
    await requireAppIntegrity(ctx.req, ctx.user.id, "rider.order");
    requireRiderRole(ctx.user.role);
    const rider = await getRiderByUserId(ctx.user.id);
    if (!rider?.isActive) throw new TRPCError({ code: "FORBIDDEN", message: "Active rider profile required" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order service unavailable" });
    const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.riderId, rider.id))).limit(1);
    if (!order) throw new TRPCError({ code: "FORBIDDEN", message: "Order is not assigned to this rider" });
    assertOrderTransition(order.status, input.status, "rider");
    await updateOrderStatus(order.id, input.status, "rider", input.note, ctx.user.id);

    const messages = {
      out_for_delivery: { title: "On the way", body: `Your order #${order.orderNumber} is out for delivery.` },
      delivered: { title: "Order delivered", body: `Your order #${order.orderNumber} has been delivered.` },
    } as const;
    const message = messages[input.status];
    await createNotification({ userId: order.userId, type: "order_update", title: message.title, body: message.body, orderId: order.id });
    sendPushToUser(order.userId, message.title, message.body, { orderId: order.id }).catch(() => {});
    const [customer] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, order.userId)).limit(1);
    if (customer?.phone) sendOrderStatusWhatsApp(customer.phone, order.orderNumber, input.status, input.note).catch(() => {});
    return { success: true };
  }),
});
