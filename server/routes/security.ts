import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createIntegrityChallenge } from "../security/app-integrity";

export const securityRouter = router({
  createIntegrityChallenge: protectedProcedure.input(z.object({
    platform: z.enum(["android", "ios"]),
    operation: z.enum(["checkout", "payment.initialize", "payment.verify", "promo.redeem", "loyalty.redeem", "rider.location", "rider.order", "admin"]),
  })).mutation(({ ctx, input }) => createIntegrityChallenge(ctx.user.id, input.platform, input.operation)),
});
