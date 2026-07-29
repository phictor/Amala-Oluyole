import { z } from "zod";
import { createSupportTicket, getUserSupportTickets } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const supportRouter = router({
  list: protectedProcedure
    .query(({ ctx }) => getUserSupportTickets(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      orderId: z.number().optional(),
      category: z.enum(["order_issue", "payment", "delivery", "food_quality", "app_bug", "general"]),
      subject: z.string().min(5).max(256),
      message: z.string().min(10),
    }))
    .mutation(({ ctx, input }) => createSupportTicket({
      userId: ctx.user.id,
      orderId: input.orderId,
      category: input.category,
      subject: input.subject,
      message: input.message,
    })),
});
