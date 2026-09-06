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
import crypto from "crypto";
import { awardLoyaltyPoints, createNotification, getDb, markOrderPaidIfPending, updateOrderStatus } from "../db";
import { orders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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

  // Keep the Paystack payload untouched for HMAC verification. All other routes
  // use the normal JSON and URL-encoded parsers.
  app.use((req, res, next) => {
    if (req.path === "/api/paystack/webhook") return next();
    return express.json({ limit: "50mb" })(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.path === "/api/paystack/webhook") return next();
    return express.urlencoded({ limit: "50mb", extended: true })(req, res, next);
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // ── Paystack webhook ─────────────────────────────────────────────────────
  // Must be registered BEFORE express.json() parses the body, so we use
  // express.raw() here to get the raw buffer for HMAC verification.
  app.post("/api/paystack/webhook",
    express.raw({ type: "*/*" }),
    async (req, res) => {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      const sig = (req.headers["x-paystack-signature"] as string) ?? "";
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body));
      if (!secret) {
        res.status(503).json({ error: "Payment webhook is not configured" });
        return;
      }
      if (!sig) {
        res.status(401).json({ error: "Missing signature" });
        return;
      }
      const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
      if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
      let event: { event?: string; data?: Record<string, unknown> };
      try { event = JSON.parse(rawBody.toString()); } catch { res.sendStatus(400); return; }
      if (event.event !== "charge.success") {
        res.sendStatus(200);
        return;
      }

      const ref = typeof event.data?.reference === "string" ? event.data.reference : "";
      const paidAmount = Number(event.data?.amount);
      if (!ref || !Number.isFinite(paidAmount) || event.data?.currency !== "NGN") {
        res.status(400).json({ error: "Invalid payment event" });
        return;
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [order] = await db
          .select({ id: orders.id, userId: orders.userId, orderNumber: orders.orderNumber, paymentStatus: orders.paymentStatus, status: orders.status, total: orders.total })
          .from(orders).where(eq(orders.paymentReference, ref)).limit(1);
        if (!order) {
          res.status(404).json({ error: "Order not found" });
          return;
        }
        if (paidAmount !== Math.round(Number(order.total) * 100)) {
          res.status(400).json({ error: "Payment amount does not match order" });
          return;
        }

        const markedPaid = await markOrderPaidIfPending(order.id);
        if (!markedPaid) {
          res.sendStatus(200);
          return;
        }
        const nextStatus = order.status === "created" || order.status === "awaiting_payment"
          ? "payment_confirmed"
          : order.status;
        await updateOrderStatus(order.id, nextStatus, "Payment confirmed by Paystack webhook");
        await awardLoyaltyPoints(order.userId, order.id, Number(order.total));
        if (order.userId) {
          await createNotification({ userId: order.userId, type: "order_update", title: "Payment confirmed", body: `We have received payment for order #${order.orderNumber}. The kitchen will begin shortly.`, orderId: order.id });
        }
        res.sendStatus(200);
      } catch (err) {
        console.error("[Paystack webhook]", err);
        res.sendStatus(500);
      }
    }
  );


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
