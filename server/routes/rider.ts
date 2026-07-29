import { z } from "zod";
import {
  getOrdersByRider, getRiderByUserId, getRiderCurrentLocation,
  updateOrderStatus, updateRiderLocation, updateRiderStatus,
} from "../db";
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
      return { success: true };
    }),
});
