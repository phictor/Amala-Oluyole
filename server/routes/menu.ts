import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getBranches, getFeaturedMeals, getMealById, getMealCategories, getMeals, getUserFavourites, toggleFavourite, getDb } from "../db";
import { promoCodes } from "../../drizzle/schema";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { BUILDER_OPTIONS } from "../catalog/builder-options";

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

  // ── Builder options (public — swallow, soup, protein, extras) ────────────────
  // These are fixed menu options for the Build Your Swallow feature.
  // Stored here as a server-side constant so the kitchen can toggle availability
  // without a DB migration. In a future version these can be moved to a DB table.
  builderOptions: publicProcedure.query(() => BUILDER_OPTIONS),

  favourites: protectedProcedure
    .query(({ ctx }) => getUserFavourites(ctx.user.id)),

  toggleFavourite: protectedProcedure
    .input(z.object({ mealId: z.number() }))
    .mutation(({ ctx, input }) => toggleFavourite(ctx.user.id, input.mealId)),
});
