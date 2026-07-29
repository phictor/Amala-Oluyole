import { z } from "zod";
import { createCateringRequest, getUserCateringRequests } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const cateringRouter = router({
  list: protectedProcedure
    .query(({ ctx }) => getUserCateringRequests(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      contactName: z.string().min(2),
      contactPhone: z.string().min(7),
      contactEmail: z.string().email().optional(),
      eventType: z.string().min(2),
      eventDate: z.string(),
      guestCount: z.number().min(10),
      venue: z.string().min(5),
      mealPreferences: z.string().optional(),
      budget: z.number().optional(),
      additionalRequirements: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => createCateringRequest({
      ...input,
      userId: ctx.user.id,
      eventDate: new Date(input.eventDate),
      contactEmail: input.contactEmail || null,
      mealPreferences: input.mealPreferences || null,
      budget: input.budget ? String(input.budget) : null,
      additionalRequirements: input.additionalRequirements || null,
    })),
});
