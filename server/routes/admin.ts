import { z } from "zod";
import {
  getActiveOrders, getAllRiders, getOrderStats, getOrderWithItems,
  updateOrderStatus, assignRiderToOrder, getAvailableRiders,
} from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { meals, mealCategories, orders, users, riders, branches } from "../../drizzle/schema";
import { eq, desc, count, and, gte } from "drizzle-orm";

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

  // ── Meal Management (CRUD) ────────────────────────────────────────────────
  allMeals: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(meals).orderBy(meals.categoryId, meals.sortOrder, meals.name);
  }),

  createMeal: adminProcedure
    .input(z.object({
      categoryId: z.number(),
      name: z.string().min(2),
      description: z.string().optional(),
      price: z.number().positive(),
      imageUrl: z.string().url().optional(),
      preparationTime: z.number().default(15),
      isAvailable: z.boolean().default(true),
      isPopular: z.boolean().default(false),
      isBestSeller: z.boolean().default(false),
      isChefSpecial: z.boolean().default(false),
      isSpicy: z.boolean().default(false),
      labels: z.array(z.string()).default([]),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [result] = await db.insert(meals).values({
        ...input,
        price: String(input.price),
      }).$returningId();
      return { id: result.id, success: true };
    }),

  updateMeal: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(2).optional(),
      description: z.string().optional(),
      price: z.number().positive().optional(),
      imageUrl: z.string().optional(),
      preparationTime: z.number().optional(),
      isAvailable: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      isBestSeller: z.boolean().optional(),
      isChefSpecial: z.boolean().optional(),
      isSpicy: z.boolean().optional(),
      labels: z.array(z.string()).optional(),
      sortOrder: z.number().optional(),
      categoryId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { id, price, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (price !== undefined) updateData.price = String(price);
      await db.update(meals).set(updateData).where(eq(meals.id, id));
      return { success: true };
    }),

  deleteMeal: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(meals).set({ isAvailable: false, updatedAt: new Date() }).where(eq(meals.id, input.id));
      return { success: true };
    }),

  // ── Dashboard Overview ────────────────────────────────────────────────────
  overview: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalOrders] = await db.select({ count: count() }).from(orders);
    const [todayOrders] = await db.select({ count: count() }).from(orders).where(gte(orders.createdAt, today));
    const [totalMeals] = await db.select({ count: count() }).from(meals);
    const [totalRiders] = await db.select({ count: count() }).from(riders).where(eq(riders.isActive, true));
    const [totalBranches] = await db.select({ count: count() }).from(branches).where(eq(branches.isActive, true));
    return {
      totalOrders: totalOrders.count,
      todayOrders: todayOrders.count,
      totalMeals: totalMeals.count,
      totalRiders: totalRiders.count,
      totalBranches: totalBranches.count,
    };
  }),
});
