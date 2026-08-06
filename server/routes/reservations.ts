import { z } from "zod";
import { cancelReservation, createReservation, getUserReservations } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const reservationsRouter = router({
  list: protectedProcedure
    .query(({ ctx }) => getUserReservations(ctx.user.id)),

  create: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      guestName: z.string().min(2),
      guestPhone: z.string().min(7),
      guestEmail: z.string().email().optional(),
      partySize: z.number().min(1).max(50),
      reservationDate: z.string(), // ISO date string
      occasion: z.string().optional(),
      specialRequests: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => createReservation({
      ...input,
      userId: ctx.user.id,
      reservationDate: new Date(input.reservationDate),
      guestEmail: input.guestEmail || null,
      occasion: input.occasion || null,
      specialRequests: input.specialRequests || null,
    })),

  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => cancelReservation(input.id, ctx.user.id)),
});
