import { z } from "zod";
import { getLoyaltyAccount, getLoyaltyTransactions } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const loyaltyRouter = router({
  account: protectedProcedure
    .query(({ ctx }) => getLoyaltyAccount(ctx.user.id)),

  transactions: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(({ ctx, input }) => getLoyaltyTransactions(ctx.user.id, input?.limit)),
});
