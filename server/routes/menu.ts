import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { getBranches, getFeaturedMeals, getMealById, getMealCategories, getMeals, getUserFavourites, toggleFavourite, getDb } from "../db";
import { mealCategories, meals, promoCodes } from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

export const menuRouter = router({
  branches: publicProcedure.query(() => getBranches()),

  categories: publicProcedure.query(() => getMealCategories()),

  meals: publicProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      branchId: z.number().optional(),
      search: z.string().optional(),
      popular: z.boolean().optional(),
    }).optional())
    .query(({ input }) => getMeals(input)),

  featured: publicProcedure.query(() => getFeaturedMeals()),

  meal: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getMealById(input.id)),

  // ── Active promotions (public — shown on promotions screen) ─────────────────
  activePromotions: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const now = new Date();
    return db.select().from(promoCodes).where(
      and(
        eq(promoCodes.isActive, true),
      )
    ).orderBy(promoCodes.createdAt);
  }),

  // ── Builder options (public — live staff-managed menu) ──────────────────────
  builderOptions: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { swallows: [], soups: [], proteins: [], extras: [] };

    const categories = await db.select({ id: mealCategories.id, slug: mealCategories.slug })
      .from(mealCategories)
      .where(and(eq(mealCategories.isActive, true), inArray(mealCategories.slug, ["swallow", "soup", "protein", "sides"])));
    const categoryIds = categories.map((category) => category.id);
    if (!categoryIds.length) return { swallows: [], soups: [], proteins: [], extras: [] };

    const categoryById = new Map(categories.map((category) => [category.id, category.slug]));
    const menuItems = await db.select().from(meals)
      .where(and(inArray(meals.categoryId, categoryIds), eq(meals.isAvailable, true)))
      .orderBy(meals.sortOrder, meals.name);
    const toOption = (meal: typeof menuItems[number]) => ({
      id: String(meal.id),
      name: meal.name,
      price: Number(meal.price),
      isAvailable: meal.isAvailable,
    });

    return {
      swallows: menuItems.filter((meal) => categoryById.get(meal.categoryId) === "swallow").map(toOption),
      // These accompaniments are part of an Amala serving, not standalone products.
      soups: [
        { id: "included-gbegiri", name: "Gbegiri (included)", price: 0, isAvailable: true },
        { id: "optional-ewedu", name: "Ewedu (optional)", price: 0, isAvailable: true },
      ],
      proteins: menuItems
        .filter((meal) => categoryById.get(meal.categoryId) === "protein")
        .map((meal) => ({ ...toOption(meal), isPremium: Number(meal.price) >= 5000 })),
      extras: menuItems
        .filter((meal) => categoryById.get(meal.categoryId) === "sides")
        .map((meal) => ({ ...toOption(meal), category: "side" })),
    };
  }),

  favourites: protectedProcedure
    .query(({ ctx }) => getUserFavourites(ctx.user.id)),

  toggleFavourite: protectedProcedure
    .input(z.object({ mealId: z.number() }))
    .mutation(({ ctx, input }) => toggleFavourite(ctx.user.id, input.mealId)),
});
