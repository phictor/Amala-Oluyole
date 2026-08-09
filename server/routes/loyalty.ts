import { z } from "zod";
import { getLoyaltyAccount, getLoyaltyTransactions } from "../db";
import { customerProcedure, router } from "../_core/trpc";

export const loyaltyRouter = router({
  account: customerProcedure
    .query(({ ctx }) => getLoyaltyAccount(ctx.user.id)),

  transactions: customerProcedure
    .input(z.object({ limit: z.number().default(20) }).optional())
    .query(({ ctx, input }) => getLoyaltyTransactions(ctx.user.id, input?.limit)),
});
