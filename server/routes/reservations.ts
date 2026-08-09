import { z } from "zod";
import { cancelReservation, createReservation, getUserReservations, getBranchById } from "../db";
import { customerProcedure, router } from "../_core/trpc";
import { sendReservationConfirmationEmail } from "../notifications";

export const reservationsRouter = router({
  list: customerProcedure
    .query(({ ctx }) => getUserReservations(ctx.user.id)),

  create: customerProcedure
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
    .mutation(async ({ ctx, input }) => {
      const reservation = await createReservation({
        ...input,
        userId: ctx.user.id,
        reservationDate: new Date(input.reservationDate),
        guestEmail: input.guestEmail || null,
        occasion: input.occasion || null,
        specialRequests: input.specialRequests || null,
      });
      // Send confirmation email + .ics calendar attachment if guest provided email
      if (input.guestEmail) {
        const branch = await getBranchById(input.branchId).catch(() => undefined);
        sendReservationConfirmationEmail({
          guestName: input.guestName,
          guestEmail: input.guestEmail,
          guestPhone: input.guestPhone,
          partySize: input.partySize,
          reservationDate: new Date(input.reservationDate),
          occasion: input.occasion ?? null,
          specialRequests: input.specialRequests ?? null,
          branchName: branch?.name ?? "Amala Oluyole",
          branchAddress: branch?.address ?? "Ibadan, Nigeria",
          reservationId: reservation.id,
        }).catch(() => {});
      }
      return reservation;
    }),

  cancel: customerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => cancelReservation(input.id, ctx.user.id)),
});
