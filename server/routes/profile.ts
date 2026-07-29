import { z } from "zod";
import { getUserById, updateUserProfile } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const profileRouter = router({
  me: protectedProcedure
    .query(({ ctx }) => getUserById(ctx.user.id)),

  update: protectedProcedure
    .input(z.object({
      name: z.string().min(2).optional(),
      phone: z.string().min(7).optional(),
      preferredBranchId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, input);
      return getUserById(ctx.user.id);
    }),

  registerPushToken: protectedProcedure
    .input(z.object({ token: z.string(), platform: z.enum(["ios", "android", "web"]) }))
    .mutation(async ({ ctx, input }) => {
      await updateUserProfile(ctx.user.id, { pushToken: input.token });
      return { success: true };
    }),
});

