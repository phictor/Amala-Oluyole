import { z } from "zod";
import { createAddress, deleteAddress, getUserAddresses } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const addressesRouter = router({
  list: protectedProcedure
    .query(({ ctx }) => getUserAddresses(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      label: z.string().default("Home"),
      fullAddress: z.string().min(5),
      landmark: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      isDefault: z.boolean().default(false),
    }))
    .mutation(({ ctx, input }) => createAddress({
      ...input,
      userId: ctx.user.id,
      landmark: input.landmark || null,
    })),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteAddress(input.id, ctx.user.id)),
});
