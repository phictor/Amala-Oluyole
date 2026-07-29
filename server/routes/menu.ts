import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getBranches, getFeaturedMeals, getMealById, getMealCategories, getMeals, getUserFavourites, toggleFavourite, getDb } from "../db";
import { promoCodes } from "../../drizzle/schema";
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

  // ── Builder options (public — swallow, soup, protein, extras) ────────────────
  // These are fixed menu options for the Build Your Swallow feature.
  // Stored here as a server-side constant so the kitchen can toggle availability
  // without a DB migration. In a future version these can be moved to a DB table.
  builderOptions: publicProcedure.query(() => ({
    swallows: [
      { id: 'sw1', name: 'Amala', price: 0, isAvailable: true },
      { id: 'sw2', name: 'Eba (Garri)', price: 0, isAvailable: true },
      { id: 'sw3', name: 'Semo', price: 200, isAvailable: true },
      { id: 'sw4', name: 'Pounded Yam', price: 500, isAvailable: true },
      { id: 'sw5', name: 'Wheat', price: 200, isAvailable: true },
      { id: 'sw6', name: 'Fufu', price: 0, isAvailable: false },
    ],
    soups: [
      { id: 'so1', name: 'Ewedu', price: 0, isAvailable: true },
      { id: 'so2', name: 'Gbegiri', price: 0, isAvailable: true },
      { id: 'so3', name: 'Egusi', price: 300, isAvailable: true },
      { id: 'so4', name: 'Efo Riro', price: 300, isAvailable: true },
      { id: 'so5', name: 'Okra (Ila)', price: 200, isAvailable: true },
      { id: 'so6', name: 'Ogbono', price: 200, isAvailable: true },
      { id: 'so7', name: 'Bitterleaf', price: 200, isAvailable: false },
    ],
    proteins: [
      { id: 'pr1', name: 'Beef', price: 500, isAvailable: true, isPremium: false },
      { id: 'pr2', name: 'Assorted Meat', price: 700, isAvailable: true, isPremium: false },
      { id: 'pr3', name: 'Goat Meat', price: 800, isAvailable: true, isPremium: false },
      { id: 'pr4', name: 'Fish (Titus)', price: 600, isAvailable: true, isPremium: false },
      { id: 'pr5', name: 'Turkey', price: 900, isAvailable: true, isPremium: false },
      { id: 'pr6', name: 'Chicken', price: 800, isAvailable: true, isPremium: false },
      { id: 'pr7', name: 'Ponmo', price: 400, isAvailable: true, isPremium: false },
      { id: 'pr8', name: 'Snail', price: 1200, isAvailable: true, isPremium: true },
      { id: 'pr9', name: 'Shrimp', price: 1000, isAvailable: false, isPremium: true },
    ],
    extras: [
      { id: 'ex1', name: 'Extra Soup', price: 300, category: 'soup' },
      { id: 'ex2', name: 'Extra Stew', price: 300, category: 'stew' },
      { id: 'ex3', name: 'Extra Protein', price: 500, category: 'protein' },
      { id: 'ex4', name: 'Extra Swallow', price: 300, category: 'swallow' },
      { id: 'ex5', name: 'Plantain', price: 400, category: 'side' },
      { id: 'ex6', name: 'Coleslaw', price: 300, category: 'side' },
      { id: 'ex7', name: 'Soft Drink', price: 300, category: 'drink' },
      { id: 'ex8', name: 'Water', price: 150, category: 'drink' },
      { id: 'ex9', name: 'Disposable Cutlery', price: 100, category: 'other' },
    ],
  })),

  favourites: protectedProcedure
    .query(({ ctx }) => getUserFavourites(ctx.user.id)),

  toggleFavourite: protectedProcedure
    .input(z.object({ mealId: z.number() }))
    .mutation(({ ctx, input }) => toggleFavourite(ctx.user.id, input.mealId)),
});
