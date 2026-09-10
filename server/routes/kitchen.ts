import { z } from "zod";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  inventory,
  inventoryPurchases,
  inventoryTransactions,
  orders,
  orderItems,
  meals,
  mealBranchAvailability,
} from "../../drizzle/schema";
import { users } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import { createNotification } from "../db";

// Kitchen + admin + manager can access all kitchen procedures
const kitchenProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["admin", "manager", "kitchen"];
  if (!ctx.user || !allowed.includes(ctx.user.role)) {
    throw new Error("Access denied: kitchen staff only");
  }
  return next({ ctx });
});

export const kitchenRouter = router({
  // ── INVENTORY ──────────────────────────────────────────────────────────────
  allInventory: kitchenProcedure
    .input(z.object({ branchId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [] as any;
      return db
        .select()
        .from(inventory)
        .where(and(eq(inventory.branchId, input.branchId), eq(inventory.isActive, true)))
        .orderBy(inventory.category, inventory.name);
    }),

  recentPurchases: kitchenProcedure
    .input(z.object({ branchId: z.number(), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [] as any;
      return db
        .select({
          id: inventoryPurchases.id,
          inventoryId: inventoryPurchases.inventoryId,
          ingredientName: inventory.name,
          category: inventory.category,
          stockUnit: inventory.unit,
          stockQuantity: inventoryPurchases.stockQuantity,
          sourceQuantity: inventoryPurchases.sourceQuantity,
          sourceUnit: inventoryPurchases.sourceUnit,
          pieceCount: inventoryPurchases.pieceCount,
          totalCost: inventoryPurchases.totalCost,
          supplier: inventoryPurchases.supplier,
          receiptReference: inventoryPurchases.receiptReference,
          notes: inventoryPurchases.notes,
          purchasedAt: inventoryPurchases.purchasedAt,
        })
        .from(inventoryPurchases)
        .innerJoin(inventory, eq(inventoryPurchases.inventoryId, inventory.id))
        .where(eq(inventoryPurchases.branchId, input.branchId))
        .orderBy(desc(inventoryPurchases.purchasedAt))
        .limit(input.limit);
    }),

  addInventoryItem: kitchenProcedure
    .input(z.object({
      branchId: z.number(),
      name: z.string().min(1),
      category: z.enum(["swallow","soup","protein","spice","vegetable","drink","packaging","other"]),
      unit: z.string().default("kg"),
      currentStock: z.number().default(0),
      minimumStock: z.number().default(0),
      costPerUnit: z.number().default(0),
      supplier: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(inventory).values({
        branchId: input.branchId,
        name: input.name,
        category: input.category,
        unit: input.unit,
        currentStock: String(input.currentStock),
        minimumStock: String(input.minimumStock),
        costPerUnit: String(input.costPerUnit),
        supplier: input.supplier,
        notes: input.notes,
      });
      return { success: true };
    }),

  updateInventoryItem: kitchenProcedure
    .input(z.object({
      id: z.number().int().positive(),
      branchId: z.number().int().positive(),
      name: z.string().trim().min(1).max(128).optional(),
      category: z.enum(["swallow", "soup", "protein", "spice", "vegetable", "drink", "packaging", "other"]).optional(),
      unit: z.string().trim().min(1).max(32).optional(),
      currentStock: z.number().min(0).optional(),
      minimumStock: z.number().min(0).optional(),
      costPerUnit: z.number().min(0).optional(),
      supplier: z.string().trim().max(128).nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [ingredient] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.id, input.id), eq(inventory.branchId, input.branchId), eq(inventory.isActive, true)))
        .limit(1);
      if (!ingredient) throw new Error("Ingredient is not available for this kitchen branch");

      const oldStock = Number(ingredient.currentStock) || 0;
      const nextStock = input.currentStock ?? oldStock;
      const stockDifference = nextStock - oldStock;

      await db.transaction(async (tx) => {
        await tx.update(inventory)
          .set({
            name: input.name ?? ingredient.name,
            category: input.category ?? ingredient.category,
            unit: input.unit ?? ingredient.unit,
            currentStock: String(nextStock),
            minimumStock: String(input.minimumStock ?? Number(ingredient.minimumStock)),
            costPerUnit: String(input.costPerUnit ?? Number(ingredient.costPerUnit)),
            supplier: input.supplier === undefined ? ingredient.supplier : input.supplier,
            notes: input.notes === undefined ? ingredient.notes : input.notes,
          })
          .where(eq(inventory.id, ingredient.id));
        if (stockDifference !== 0) {
          await tx.insert(inventoryTransactions).values({
            inventoryId: ingredient.id,
            branchId: input.branchId,
            type: "adjustment",
            quantity: String(stockDifference),
            note: "Stock adjusted while editing ingredient details",
            recordedBy: ctx.user.id,
          });
        }
      });
      return { success: true, currentStock: nextStock, stockDifference };
    }),

  recordIngredientPurchase: kitchenProcedure
    .input(z.object({
      inventoryId: z.number().int().positive(),
      branchId: z.number().int().positive(),
      stockQuantity: z.number().positive(),
      sourceQuantity: z.number().positive().optional(),
      sourceUnit: z.string().trim().min(1).max(32).optional(),
      pieceCount: z.number().int().positive().optional(),
      totalCost: z.number().positive(),
      supplier: z.string().trim().min(1).max(128).optional(),
      receiptReference: z.string().trim().min(1).max(64).optional(),
      notes: z.string().trim().max(1000).optional(),
      purchasedAt: z.coerce.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [ingredient] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.id, input.inventoryId), eq(inventory.branchId, input.branchId), eq(inventory.isActive, true)))
        .limit(1);
      if (!ingredient) throw new Error("Ingredient is not available for this kitchen branch");

      const purchasedAt = input.purchasedAt ?? new Date();
      const currentStock = Number(ingredient.currentStock) || 0;
      const currentUnitCost = Number(ingredient.costPerUnit) || 0;
      const newStock = currentStock + input.stockQuantity;
      const weightedUnitCost = ((currentStock * currentUnitCost) + input.totalCost) / newStock;

      await db.transaction(async (tx) => {
        await tx.insert(inventoryPurchases).values({
          inventoryId: input.inventoryId,
          branchId: input.branchId,
          stockQuantity: String(input.stockQuantity),
          sourceQuantity: input.sourceQuantity === undefined ? null : String(input.sourceQuantity),
          sourceUnit: input.sourceUnit ?? null,
          pieceCount: input.pieceCount ?? null,
          totalCost: String(input.totalCost),
          supplier: input.supplier ?? null,
          receiptReference: input.receiptReference ?? null,
          notes: input.notes ?? null,
          purchasedAt,
          recordedBy: ctx.user.id,
        });
        await tx.insert(inventoryTransactions).values({
          inventoryId: input.inventoryId,
          branchId: input.branchId,
          type: "restock",
          quantity: String(input.stockQuantity),
          note: input.notes ?? `Purchase${input.supplier ? ` from ${input.supplier}` : ""}`,
          recordedBy: ctx.user.id,
        });
        await tx.update(inventory)
          .set({
            currentStock: String(newStock),
            costPerUnit: String(weightedUnitCost),
            supplier: input.supplier ?? ingredient.supplier,
            lastRestockedAt: purchasedAt,
          })
          .where(eq(inventory.id, input.inventoryId));
      });
      return { success: true, newStock, weightedUnitCost };
    }),

  updateIngredientPurchase: kitchenProcedure
    .input(z.object({
      purchaseId: z.number().int().positive(),
      branchId: z.number().int().positive(),
      inventoryId: z.number().int().positive(),
      stockQuantity: z.number().positive(),
      sourceQuantity: z.number().positive().nullable().optional(),
      sourceUnit: z.string().trim().min(1).max(32).nullable().optional(),
      pieceCount: z.number().int().positive().nullable().optional(),
      totalCost: z.number().positive(),
      supplier: z.string().trim().min(1).max(128).nullable().optional(),
      receiptReference: z.string().trim().min(1).max(64).nullable().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
      purchasedAt: z.coerce.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [purchase] = await db
        .select()
        .from(inventoryPurchases)
        .where(and(eq(inventoryPurchases.id, input.purchaseId), eq(inventoryPurchases.branchId, input.branchId)))
        .limit(1);
      if (!purchase) throw new Error("Purchase record is not available for this kitchen branch");

      const [ingredient] = await db
        .select()
        .from(inventory)
        .where(and(eq(inventory.id, purchase.inventoryId), eq(inventory.branchId, input.branchId), eq(inventory.isActive, true)))
        .limit(1);
      if (!ingredient) throw new Error("The linked ingredient is no longer available");

      const [targetIngredient] = input.inventoryId === purchase.inventoryId
        ? [ingredient]
        : await db
          .select()
          .from(inventory)
          .where(and(eq(inventory.id, input.inventoryId), eq(inventory.branchId, input.branchId), eq(inventory.isActive, true)))
          .limit(1);
      if (!targetIngredient) throw new Error("Choose an active ingredient for this purchase");

      const oldPurchaseQuantity = Number(purchase.stockQuantity) || 0;
      const isMovingIngredient = targetIngredient.id !== ingredient.id;
      const stockDifference = input.stockQuantity - oldPurchaseQuantity;
      const originalNextStock = isMovingIngredient
        ? (Number(ingredient.currentStock) || 0) - oldPurchaseQuantity
        : (Number(ingredient.currentStock) || 0) + stockDifference;
      const targetNextStock = isMovingIngredient
        ? (Number(targetIngredient.currentStock) || 0) + input.stockQuantity
        : originalNextStock;
      if (originalNextStock < 0) {
        throw new Error("This edit would make the original ingredient stock negative. Record a stock adjustment after confirming the physical count.");
      }

      const updatedPurchaseDate = input.purchasedAt ?? purchase.purchasedAt;
      const updatedSupplier = input.supplier === undefined ? purchase.supplier : input.supplier;
      await db.transaction(async (tx) => {
        const purchases = await tx
          .select({ id: inventoryPurchases.id, inventoryId: inventoryPurchases.inventoryId, stockQuantity: inventoryPurchases.stockQuantity, totalCost: inventoryPurchases.totalCost })
          .from(inventoryPurchases)
          .where(sql`${inventoryPurchases.inventoryId} IN (${ingredient.id}, ${targetIngredient.id})`);
        const effectivePurchases = purchases.map((item) => item.id === purchase.id
          ? { ...item, inventoryId: targetIngredient.id, stockQuantity: String(input.stockQuantity), totalCost: String(input.totalCost) }
          : item);
        const weightedCost = (inventoryId: number, fallback: number) => {
          const totals = effectivePurchases
            .filter((item) => item.inventoryId === inventoryId)
            .reduce((sum, item) => ({ quantity: sum.quantity + (Number(item.stockQuantity) || 0), cost: sum.cost + (Number(item.totalCost) || 0) }), { quantity: 0, cost: 0 });
          return totals.quantity > 0 ? totals.cost / totals.quantity : fallback;
        };
        const originalWeightedCost = weightedCost(ingredient.id, Number(ingredient.costPerUnit) || 0);
        const targetWeightedCost = weightedCost(targetIngredient.id, Number(targetIngredient.costPerUnit) || 0);

        await tx.update(inventoryPurchases)
          .set({
            inventoryId: targetIngredient.id,
            stockQuantity: String(input.stockQuantity),
            sourceQuantity: input.sourceQuantity === undefined ? purchase.sourceQuantity : input.sourceQuantity === null ? null : String(input.sourceQuantity),
            sourceUnit: input.sourceUnit === undefined ? purchase.sourceUnit : input.sourceUnit,
            pieceCount: input.pieceCount === undefined ? purchase.pieceCount : input.pieceCount,
            totalCost: String(input.totalCost),
            supplier: updatedSupplier,
            receiptReference: input.receiptReference === undefined ? purchase.receiptReference : input.receiptReference,
            notes: input.notes === undefined ? purchase.notes : input.notes,
            purchasedAt: updatedPurchaseDate,
          })
          .where(eq(inventoryPurchases.id, purchase.id));
        await tx.update(inventory)
          .set({
            currentStock: String(originalNextStock),
            costPerUnit: String(originalWeightedCost),
          })
          .where(eq(inventory.id, ingredient.id));
        if (isMovingIngredient) {
          await tx.update(inventory)
            .set({
              currentStock: String(targetNextStock),
              costPerUnit: String(targetWeightedCost),
              supplier: updatedSupplier ?? targetIngredient.supplier,
              lastRestockedAt: updatedPurchaseDate,
            })
            .where(eq(inventory.id, targetIngredient.id));
          await tx.insert(inventoryTransactions).values([
            {
              inventoryId: ingredient.id,
              branchId: input.branchId,
              type: "adjustment",
              quantity: String(-oldPurchaseQuantity),
              note: `Purchase record #${purchase.id} moved to ${targetIngredient.name}`,
              recordedBy: ctx.user.id,
            },
            {
              inventoryId: targetIngredient.id,
              branchId: input.branchId,
              type: "adjustment",
              quantity: String(input.stockQuantity),
              note: `Purchase record #${purchase.id} reassigned from ${ingredient.name}`,
              recordedBy: ctx.user.id,
            },
          ]);
        } else if (stockDifference !== 0) {
          await tx.update(inventory)
            .set({ supplier: updatedSupplier ?? ingredient.supplier, lastRestockedAt: updatedPurchaseDate })
            .where(eq(inventory.id, ingredient.id));
          await tx.insert(inventoryTransactions).values({
            inventoryId: ingredient.id,
            branchId: input.branchId,
            type: "adjustment",
            quantity: String(stockDifference),
            note: `Purchase record #${purchase.id} corrected`,
            recordedBy: ctx.user.id,
          });
        } else {
          await tx.update(inventory)
            .set({ supplier: updatedSupplier ?? ingredient.supplier, lastRestockedAt: updatedPurchaseDate })
            .where(eq(inventory.id, ingredient.id));
        }
      });
      return { success: true, inventoryId: targetIngredient.id, currentStock: targetNextStock, stockDifference };
    }),

  updateStock: kitchenProcedure
    .input(z.object({
      inventoryId: z.number(),
      branchId: z.number(),
      type: z.enum(["restock","usage","waste","adjustment"]),
      quantity: z.number(), // positive = add, negative = remove
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Record the transaction
      await db.insert(inventoryTransactions).values({
        inventoryId: input.inventoryId,
        branchId: input.branchId,
        type: input.type,
        quantity: String(input.quantity),
        note: input.note,
        recordedBy: ctx.user.id,
      });
      // Update current stock
      const item = await db.select().from(inventory).where(eq(inventory.id, input.inventoryId)).limit(1);
      if (item.length > 0) {
        const newStock = Math.max(0, parseFloat(String(item[0].currentStock)) + input.quantity);
        await db.update(inventory)
          .set({
            currentStock: String(newStock),
            lastRestockedAt: input.type === "restock" ? new Date() : undefined,
          })
          .where(eq(inventory.id, input.inventoryId));
        // ── Low-stock push notification ──────────────────────────────────────
        const minStock = parseFloat(String(item[0].minimumStock));
        if (newStock <= minStock && input.type !== "restock") {
          // Notify the project owner via Manus notification service
          notifyOwner({
            title: `⚠️ Low Stock Alert: ${item[0].name}`,
            content: `${item[0].name} is running low. Current: ${newStock} ${item[0].unit} (min: ${minStock} ${item[0].unit}). Please restock soon.`,
          }).catch(() => {});
          // Also create in-app notifications for all admin/manager users
          const managers = await db.select({ id: users.id }).from(users)
            .where(sql`${users.role} IN ('admin', 'manager')`);
          await Promise.all(managers.map(m =>
            createNotification({
              userId: m.id,
              type: "general",
              title: `⚠️ Low Stock: ${item[0].name}`,
              body: `${item[0].name} is at ${newStock} ${item[0].unit} (minimum: ${minStock} ${item[0].unit}). Please restock.`,
            }).catch(() => {})
          ));
        }
      }
      return { success: true };
    }),

  deleteInventoryItem: kitchenProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(inventory).set({ isActive: false }).where(eq(inventory.id, input.id));
      return { success: true };
    }),

  stockTransactions: kitchenProcedure
    .input(z.object({ inventoryId: z.number(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [] as any;
      return db
        .select()
        .from(inventoryTransactions)
        .where(eq(inventoryTransactions.inventoryId, input.inventoryId))
        .orderBy(desc(inventoryTransactions.createdAt))
        .limit(input.limit);
    }),

  // ── MEAL AVAILABILITY (kitchen can toggle availability) ────────────────────
  toggleMealAvailability: kitchenProcedure
    .input(z.object({ mealId: z.number(), branchId: z.number(), isAvailable: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      // Update global meal availability
      await db.update(meals)
        .set({ isAvailable: input.isAvailable })
        .where(eq(meals.id, input.mealId));
      // Also update branch-specific availability if record exists
      const existing = await db.select().from(mealBranchAvailability)
        .where(and(eq(mealBranchAvailability.mealId, input.mealId), eq(mealBranchAvailability.branchId, input.branchId)))
        .limit(1);
      if (existing.length > 0) {
        await db.update(mealBranchAvailability)
          .set({ isAvailable: input.isAvailable })
          .where(and(eq(mealBranchAvailability.mealId, input.mealId), eq(mealBranchAvailability.branchId, input.branchId)));
      }
      return { success: true };
    }),

  // ── MONTHLY REPORT ─────────────────────────────────────────────────────────
  monthlyReport: kitchenProcedure
    .input(z.object({
      branchId: z.number(),
      year: z.number(),
      month: z.number(), // 1-12
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

      // Total orders and revenue for the month
      const orderStats = await db
        .select({
          totalOrders: sql<number>`COUNT(*)`,
          totalRevenue: sql<number>`SUM(CAST(${orders.total} AS DECIMAL(10,2)))`,
          completedOrders: sql<number>`SUM(CASE WHEN ${orders.status} IN ('completed','delivered') THEN 1 ELSE 0 END)`,
          cancelledOrders: sql<number>`SUM(CASE WHEN ${orders.status} = 'cancelled' THEN 1 ELSE 0 END)`,
          avgOrderValue: sql<number>`AVG(CAST(${orders.total} AS DECIMAL(10,2)))`,
        })
        .from(orders)
        .where(and(
          eq(orders.branchId, input.branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
        ));

      // Daily order counts for the month
      // MySQL only_full_group_by: use identical raw SQL expression in SELECT and GROUP BY
      const dailyOrders = await db
        .select({
          day: sql<string>`DATE(orders.createdAt)`,
          count: sql<number>`COUNT(*)`,
          revenue: sql<number>`SUM(CAST(orders.total AS DECIMAL(10,2)))`,
        })
        .from(orders)
        .where(and(
          eq(orders.branchId, input.branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
        ))
        .groupBy(sql`DATE(orders.createdAt)`)
        .orderBy(sql`DATE(orders.createdAt)`);

      // Top 10 most ordered meals
      const topMeals = await db
        .select({
          mealName: orderItems.name,
          totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
          totalRevenue: sql<number>`SUM(CAST(${orderItems.subtotal} AS DECIMAL(10,2)))`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          eq(orders.branchId, input.branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
          eq(orderItems.isCustomMeal, false),
        ))
        .groupBy(orderItems.name)
        .orderBy(desc(sql`SUM(${orderItems.quantity})`))
        .limit(10);

      // Order type breakdown (delivery vs pickup)
      const orderTypeBreakdown = await db
        .select({
          orderType: orders.orderType,
          count: sql<number>`COUNT(*)`,
        })
        .from(orders)
        .where(and(
          eq(orders.branchId, input.branchId),
          gte(orders.createdAt, startDate),
          lte(orders.createdAt, endDate),
        ))
        .groupBy(orders.orderType);

      // Low stock items (below minimum threshold)
      const lowStockItems = await db
        .select()
        .from(inventory)
        .where(and(
          eq(inventory.branchId, input.branchId),
          eq(inventory.isActive, true),
          sql`${inventory.currentStock} <= ${inventory.minimumStock}`,
        ));

      const purchaseSummary = await db
        .select({
          totalSpent: sql<number>`COALESCE(SUM(CAST(${inventoryPurchases.totalCost} AS DECIMAL(12,2))), 0)`,
          purchaseCount: sql<number>`COUNT(*)`,
        })
        .from(inventoryPurchases)
        .where(and(
          eq(inventoryPurchases.branchId, input.branchId),
          gte(inventoryPurchases.purchasedAt, startDate),
          lte(inventoryPurchases.purchasedAt, endDate),
        ));

      const stockValue = await db
        .select({
          currentStockValue: sql<number>`COALESCE(SUM(CAST(${inventory.currentStock} AS DECIMAL(12,2)) * CAST(${inventory.costPerUnit} AS DECIMAL(12,2))), 0)`,
        })
        .from(inventory)
        .where(and(eq(inventory.branchId, input.branchId), eq(inventory.isActive, true)));

      const recentIngredientPurchases = await db
        .select({
          id: inventoryPurchases.id,
          ingredientName: inventory.name,
          stockQuantity: inventoryPurchases.stockQuantity,
          sourceQuantity: inventoryPurchases.sourceQuantity,
          sourceUnit: inventoryPurchases.sourceUnit,
          pieceCount: inventoryPurchases.pieceCount,
          totalCost: inventoryPurchases.totalCost,
          supplier: inventoryPurchases.supplier,
          purchasedAt: inventoryPurchases.purchasedAt,
        })
        .from(inventoryPurchases)
        .innerJoin(inventory, eq(inventoryPurchases.inventoryId, inventory.id))
        .where(and(
          eq(inventoryPurchases.branchId, input.branchId),
          gte(inventoryPurchases.purchasedAt, startDate),
          lte(inventoryPurchases.purchasedAt, endDate),
        ))
        .orderBy(desc(inventoryPurchases.purchasedAt))
        .limit(8);

      return {
       period: { year: input.year, month: input.month, startDate, endDate },
       summary: orderStats[0] ?? { totalOrders: 0, totalRevenue: 0, completedOrders: 0, cancelledOrders: 0, avgOrderValue: 0 },
       dailyOrders,
       topMeals,
       orderTypeBreakdown,
       lowStockItems,
       ingredientCosts: {
         totalSpent: purchaseSummary[0]?.totalSpent ?? 0,
         purchaseCount: purchaseSummary[0]?.purchaseCount ?? 0,
         currentStockValue: stockValue[0]?.currentStockValue ?? 0,
         recentPurchases: recentIngredientPurchases,
       },
     };
    }),
});
