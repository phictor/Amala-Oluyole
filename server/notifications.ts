/**
 * Amala Oluyole — Notification Helpers
 *
 * WhatsApp: Twilio WhatsApp Sandbox / Business API
 * Email:    Resend with .ics calendar attachment for reservations
 *
 * Both helpers fail silently (log error, never throw) so a missing key
 * or network hiccup never breaks the primary order/reservation flow.
 */
import twilio from "twilio";
import { Resend } from "resend";

// ─── WhatsApp via Twilio ──────────────────────────────────────────────────────

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

/**
 * Send a WhatsApp message to a customer phone number.
 * `to` should be in E.164 format, e.g. "+2348012345678"
 */
export async function sendWhatsApp(to: string, message: string): Promise<void> {
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
  if (!from) return; // silently skip if not configured
  const client = getTwilioClient();
  if (!client) return;
  try {
    await client.messages.create({
      from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      to: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      body: message,
    });
  } catch (err) {
    console.error("[WhatsApp] Failed to send message:", err);
  }
}

/**
 * Send order status WhatsApp notification to a customer.
 * Looks up the customer's phone from the users table.
 */
export async function sendOrderStatusWhatsApp(
  customerPhone: string | null | undefined,
  orderNumber: string,
  status: string,
  note?: string,
): Promise<void> {
  if (!customerPhone) return;

  const statusMessages: Record<string, string> = {
    accepted: `✅ *Amala Oluyole*\nYour order *#${orderNumber}* has been accepted and is being prepared. We'll notify you when it's ready!`,
    preparing: `👨‍🍳 *Amala Oluyole*\nYour order *#${orderNumber}* is now being prepared in our kitchen. Sit tight!`,
    ready: `🍽️ *Amala Oluyole*\nYour order *#${orderNumber}* is ready for pickup!${note ? `\n${note}` : ""}`,
    rider_assigned: `🛵 *Amala Oluyole*\nA rider has been assigned to your order *#${orderNumber}* and is on the way!`,
    out_for_delivery: `📦 *Amala Oluyole*\nYour order *#${orderNumber}* is out for delivery. Your rider is on the way!`,
    delivered: `🎉 *Amala Oluyole*\nYour order *#${orderNumber}* has been delivered. Enjoy your meal!\n\nRate your experience in the app. Thank you! 🙏`,
    completed: `🎉 *Amala Oluyole*\nThank you for dining with us! Your order *#${orderNumber}* is complete.\n\nWe'd love your feedback in the app. 🙏`,
    rejected: `❌ *Amala Oluyole*\nWe're sorry, your order *#${orderNumber}* could not be processed.${note ? `\nReason: ${note}` : ""}\n\nPlease call us or place a new order.`,
    cancelled: `🚫 *Amala Oluyole*\nYour order *#${orderNumber}* has been cancelled.${note ? `\nReason: ${note}` : ""}`,
  };

  const message = statusMessages[status];
  if (!message) return;
  await sendWhatsApp(customerPhone, message);
}

// ─── Email via Resend ─────────────────────────────────────────────────────────

function getResendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "reservations@amalaoluyole.com";

/**
 * Generate an iCalendar (.ics) string for a reservation.
 */
function generateICS(params: {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startDate: Date;
  durationMinutes: number;
  organizerEmail: string;
  attendeeEmail: string;
  attendeeName: string;
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(params.startDate.getTime() + params.durationMinutes * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Amala Oluyole//Reservation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(params.startDate)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${params.summary}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${params.location}`,
    `ORGANIZER;CN=Amala Oluyole:mailto:${params.organizerEmail}`,
    `ATTENDEE;CN=${params.attendeeName};RSVP=TRUE:mailto:${params.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Send a reservation confirmation email with a .ics calendar attachment.
 */
export async function sendReservationConfirmationEmail(params: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  reservationDate: Date;
  occasion?: string | null;
  specialRequests?: string | null;
  branchName: string;
  branchAddress: string;
  reservationId: number;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend) return; // silently skip if not configured

  const dateStr = params.reservationDate.toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeStr = params.reservationDate.toLocaleTimeString("en-NG", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const ics = generateICS({
    uid: `reservation-${params.reservationId}@amalaoluyole.com`,
    summary: `Dinner at Amala Oluyole — ${params.branchName}`,
    description: [
      `Guest: ${params.guestName}`,
      `Party size: ${params.partySize} ${params.partySize === 1 ? "person" : "people"}`,
      params.occasion ? `Occasion: ${params.occasion}` : "",
      params.specialRequests ? `Special requests: ${params.specialRequests}` : "",
      `Reservation ID: #${params.reservationId}`,
    ].filter(Boolean).join("\n"),
    location: `${params.branchName}, ${params.branchAddress}`,
    startDate: params.reservationDate,
    durationMinutes: 90,
    organizerEmail: FROM_EMAIL,
    attendeeEmail: params.guestEmail,
    attendeeName: params.guestName,
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827">
  <div style="background:#1A1640;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px">
    <h1 style="color:#D4AF37;margin:0;font-size:24px">Amala Oluyole</h1>
    <p style="color:#9BA1A6;margin:8px 0 0">Reservation Confirmed</p>
  </div>
  <p>Dear <strong>${params.guestName}</strong>,</p>
  <p>Your table reservation at <strong>Amala Oluyole ${params.branchName}</strong> has been confirmed. We look forward to welcoming you.</p>
  <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin:20px 0;border-left:4px solid #D4AF37">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#6B7280;width:140px">Date</td><td style="padding:6px 0;font-weight:600">${dateStr}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280">Time</td><td style="padding:6px 0;font-weight:600">${timeStr}</td></tr>
      <tr><td style="padding:6px 0;color:#6B7280">Location</td><td style="padding:6px 0;font-weight:600">${params.branchName}<br/><span style="font-weight:400;color:#6B7280">${params.branchAddress}</span></td></tr>
      <tr><td style="padding:6px 0;color:#6B7280">Party size</td><td style="padding:6px 0;font-weight:600">${params.partySize} ${params.partySize === 1 ? "person" : "people"}</td></tr>
      ${params.occasion ? `<tr><td style="padding:6px 0;color:#6B7280">Occasion</td><td style="padding:6px 0;font-weight:600">${params.occasion}</td></tr>` : ""}
      ${params.specialRequests ? `<tr><td style="padding:6px 0;color:#6B7280">Special requests</td><td style="padding:6px 0">${params.specialRequests}</td></tr>` : ""}
      <tr><td style="padding:6px 0;color:#6B7280">Booking ref</td><td style="padding:6px 0;font-weight:600">#${params.reservationId}</td></tr>
    </table>
  </div>
  <p>The calendar invite is attached to this email — tap it to add the reservation to your calendar.</p>
  <p>To cancel or modify your reservation, please call us or reply to this email.</p>
  <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0"/>
  <p style="color:#6B7280;font-size:13px;text-align:center">
    Amala Oluyole Restaurant · ${params.branchAddress}<br/>
    <a href="https://amalapp-pz8p5xvu.manus.space" style="color:#D4AF37">Order online</a>
  </p>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: `Amala Oluyole <${FROM_EMAIL}>`,
      to: params.guestEmail,
      subject: `Reservation Confirmed — ${dateStr} at ${timeStr}`,
      html,
      attachments: [
        {
          filename: "amala-oluyole-reservation.ics",
          content: Buffer.from(ics).toString("base64"),
        },
      ],
    });
  } catch (err) {
    console.error("[Email] Failed to send reservation confirmation:", err);
  }
}
