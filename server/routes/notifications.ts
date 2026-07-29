import { z } from "zod";
import { getUserNotifications, markAllNotificationsRead, markNotificationRead, getUnreadNotificationCount } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(30) }).optional())
    .query(({ ctx, input }) => getUserNotifications(ctx.user.id, input?.limit)),

  unreadCount: protectedProcedure
    .query(({ ctx }) => getUnreadNotificationCount(ctx.user.id)),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.id)),

  markAllRead: protectedProcedure
    .mutation(({ ctx }) => markAllNotificationsRead(ctx.user.id)),
});
