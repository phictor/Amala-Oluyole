import { adminRouter } from "./routes/admin";
import { addressesRouter } from "./routes/addresses";
import { cateringRouter } from "./routes/catering";
import { loyaltyRouter } from "./routes/loyalty";
import { menuRouter } from "./routes/menu";
import { notificationsRouter } from "./routes/notifications";
import { ordersRouter } from "./routes/orders";
import { profileRouter } from "./routes/profile";
import { reservationsRouter } from "./routes/reservations";
import { riderRouter } from "./routes/rider";
import { supportRouter } from "./routes/support";
import { kitchenRouter } from "./routes/kitchen";
import { securityRouter } from "./routes/security";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  menu: menuRouter,
  orders: ordersRouter,
  loyalty: loyaltyRouter,
  rider: riderRouter,
  reservations: reservationsRouter,
  catering: cateringRouter,
  support: supportRouter,
  notifications: notificationsRouter,
  addresses: addressesRouter,
  profile: profileRouter,
  admin: adminRouter,
  kitchen: kitchenRouter,
  security: securityRouter,
});
export type AppRouter = typeof appRouter;
