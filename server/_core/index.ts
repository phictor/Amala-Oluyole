import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { getAllRiders } from "../db";

// ── SSE: Real-time rider location broadcast ────────────────────────────────
// Clients subscribe to GET /api/riders/live and receive a stream of
// "riderLocations" events every 3 seconds.
type SseClient = { res: import("express").Response; userId: number };
const sseClients = new Set<SseClient>();

function broadcastRiderLocations(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.res.write(payload); } catch { sseClients.delete(client); }
  }
}

// Poll DB every 3 s and push to all connected SSE clients
setInterval(async () => {
  if (sseClients.size === 0) return;
  try {
    const riders = await getAllRiders();
    broadcastRiderLocations({ type: "riderLocations", riders, ts: Date.now() });
  } catch { /* ignore DB errors during poll */ }
}, 3000);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
registerOAuthRoutes(app);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

  // ── Paystack Webhook ─────────────────────────────────────────────────────
  // Must be registered BEFORE express.json() middleware so we can read the raw body for HMAC verification.
  // We use express.raw() here specifically for this route.
  app.post("/api/paystack/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
    const signature = req.headers["x-paystack-signature"] as string | undefined;
    const rawBody = req.body as Buffer;

    // Always respond 200 quickly to prevent Paystack retries
    res.sendStatus(200);

    if (!secret || !signature || !rawBody) return;

    // Verify HMAC-SHA512 signature
    const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (expected !== signature) {
      console.warn("[Paystack Webhook] Invalid signature — ignoring event");
      return;
    }

    let event: { event: string; data?: { reference?: string; amount?: number; metadata?: { orderId?: number; userId?: number } } };
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      return;
    }

    if (event.event === "charge.success") {
      const { reference, amount, metadata } = event.data ?? {};
      const orderId = metadata?.orderId;
      const userId = metadata?.userId;
      if (!orderId) return;

      try {
        const { getOrderById, updateOrderStatus, awardLoyaltyPoints, createNotification, sendPushToUser } = await import("../db");
        const order = await getOrderById(orderId);
        if (!order) return;
        if (order.paymentStatus === "paid") return; // Already confirmed

        await updateOrderStatus(orderId, "payment_confirmed", "Payment confirmed via Paystack webhook");
        if (userId && order.total) {
          await awardLoyaltyPoints(userId, orderId, Number(order.total));
        }
        const notifyUserId = userId ?? order.userId;
        if (notifyUserId) {
          const title = "Payment Confirmed ✅";
          const body = `Payment received for order #${order.orderNumber}. Your food is being prepared!`;
          createNotification({ userId: notifyUserId, orderId, type: "order_update", title, body }).catch(() => {});
          sendPushToUser(notifyUserId, title, body, { orderId, orderNumber: order.orderNumber }).catch(() => {});
        }
        console.log(`[Paystack Webhook] Order #${order.orderNumber} confirmed via webhook`);
      } catch (err) {
        console.error("[Paystack Webhook] Error processing charge.success:", err);
      }
    }
  });

  // ── SSE: /api/riders/live ────────────────────────────────────────────────
  app.get("/api/riders/live", async (req, res) => {
    try { await sdk.authenticateRequest(req); } catch {
      res.status(401).json({ error: "Not authenticated" }); return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    try {
      const riders = await getAllRiders();
      res.write(`data: ${JSON.stringify({ type: "riderLocations", riders, ts: Date.now() })}\n\n`);
    } catch { /* ignore */ }
    const client: SseClient = { res, userId: 0 };
    sseClients.add(client);
    req.on("close", () => { sseClients.delete(client); });
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
import crypto from "crypto";
