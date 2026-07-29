import { z } from "zod";
import {
  getActiveOrders, getAllRiders, getOrderStats, getOrderWithItems,
  updateOrderStatus, assignRiderToOrder, getAvailableRiders,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// Kitchen/admin procedure
const kitchenProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["admin", "manager", "kitchen"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Kitchen access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Dashboard stats
  stats: adminProcedure
    .input(z.object({
      branchId: z.number().optional(),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
    }).optional())
    .query(({ input }) => getOrderStats(
      input?.branchId,
      input?.fromDate ? new Date(input.fromDate) : undefined,
      input?.toDate ? new Date(input.toDate) : undefined,
    )),

  // Active orders monitoring
  activeOrders: kitchenProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(({ input }) => getActiveOrders(input?.branchId)),

  // Get full order detail
  orderDetail: kitchenProcedure
    .input(z.object({ orderId: z.number() }))
    .query(({ input }) => getOrderWithItems(input.orderId)),

  // Update order status (kitchen/admin)
  updateOrderStatus: kitchenProcedure
    .input(z.object({
      orderId: z.number(),
      status: z.enum(["accepted", "preparing", "ready", "rejected", "refunded"]),
      note: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => updateOrderStatus(input.orderId, input.status, input.note, ctx.user.id)),

  // Rider management
  riders: adminProcedure
    .input(z.object({ branchId: z.number().optional() }).optional())
    .query(({ input }) => getAllRiders(input?.branchId)),

  availableRiders: adminProcedure
    .input(z.object({ branchId: z.number() }))
    .query(({ input }) => getAvailableRiders(input.branchId)),

  // Assign rider to order
  assignRider: adminProcedure
    .input(z.object({ orderId: z.number(), riderId: z.number() }))
    .mutation(({ input }) => assignRiderToOrder(input.orderId, input.riderId)),
});
