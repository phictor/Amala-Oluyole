import { z } from "zod";
import { getBranches, getFeaturedMeals, getMealById, getMealCategories, getMeals, getUserFavourites, toggleFavourite } from "../db";
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

  favourites: protectedProcedure
    .query(({ ctx }) => getUserFavourites(ctx.user.id)),

  toggleFavourite: protectedProcedure
    .input(z.object({ mealId: z.number() }))
    .mutation(({ ctx, input }) => toggleFavourite(ctx.user.id, input.mealId)),
});
