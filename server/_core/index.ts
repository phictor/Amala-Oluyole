import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { getAllRiders } from "../db";
import crypto from "crypto";
import { awardLoyaltyPoints, createNotification, getDb, markOrderPaidIfPending, updateOrderStatus } from "../db";
import { orders, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// ── SSE: Real-time rider location broadcast ────────────────────────────────
// Clients subscribe to GET /api/riders/live and receive a stream of
// "riderLocations" events every 3 seconds.
type SseClient = { res: import("express").Response; userId: number };
const sseClients = new Set<SseClient>();
const KITCHEN_PORTAL_SESSION_MS = 8 * 60 * 60 * 1000;
const KITCHEN_PORTAL_MAX_ATTEMPTS = 5;
const KITCHEN_PORTAL_LOCKOUT_MS = 15 * 60 * 1000;
const kitchenAccessAttempts = new Map<string, { count: number; expiresAt: number }>();

function isMatchingKitchenAccessCode(candidate: string, configured: string) {
  const candidateBuffer = Buffer.from(candidate);
  const configuredBuffer = Buffer.from(configured);
  return candidateBuffer.length === configuredBuffer.length && crypto.timingSafeEqual(candidateBuffer, configuredBuffer);
}

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

  const kitchenPortalDir = path.resolve(process.cwd(), "kitchen-portal");
  app.use("/kitchen-portal", express.static(kitchenPortalDir));

  const getKitchenPortalUser = async (req: express.Request, res: express.Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user || !["kitchen", "admin", "manager"].includes(user.role)) {
        res.status(403).json({ error: "Kitchen access required" });
        return null;
      }
      return user;
    } catch {
      res.status(401).json({ error: "Sign in required" });
      return null;
    }
  };

  app.post("/api/kitchen-portal/session", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const accessCode = typeof req.body?.accessCode === "string" ? req.body.accessCode.trim() : "";
    const configuredCode = process.env.KITCHEN_PORTAL_ACCESS_CODE?.trim();
    if (!configuredCode) {
      res.status(503).json({ error: "Kitchen Portal access has not been configured. Contact the manager." });
      return;
    }
    if (!email || !accessCode) {
      res.status(400).json({ error: "Enter your approved work email and kitchen access code." });
      return;
    }
    const attemptKey = `${req.ip}:${email}`;
    const existingAttempt = kitchenAccessAttempts.get(attemptKey);
    const now = Date.now();
    if (existingAttempt && existingAttempt.expiresAt > now && existingAttempt.count >= KITCHEN_PORTAL_MAX_ATTEMPTS) {
      res.status(429).json({ error: "Too many failed sign-in attempts. Wait 15 minutes, then try again." });
      return;
    }
    if (!isMatchingKitchenAccessCode(accessCode, configuredCode)) {
      kitchenAccessAttempts.set(attemptKey, {
        count: (existingAttempt && existingAttempt.expiresAt > now ? existingAttempt.count : 0) + 1,
        expiresAt: now + KITCHEN_PORTAL_LOCKOUT_MS,
      });
      res.status(401).json({ error: "The email or kitchen access code is not correct." });
      return;
    }
    const db = await getDb();
    if (!db) {
      res.status(503).json({ error: "Kitchen Portal is temporarily unavailable. Please try again." });
      return;
    }
    const [staffMember] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!staffMember || !["kitchen", "admin", "manager"].includes(staffMember.role)) {
      res.status(403).json({ error: "This email is not approved for Kitchen Portal access." });
      return;
    }
    kitchenAccessAttempts.delete(attemptKey);
    const sessionToken = await sdk.createSessionToken(staffMember.openId, {
      name: staffMember.name || staffMember.email || "Kitchen staff",
      expiresInMs: KITCHEN_PORTAL_SESSION_MS,
    });
    res.cookie("app_session_id", sessionToken, { ...getSessionCookieOptions(req), maxAge: KITCHEN_PORTAL_SESSION_MS });
    res.json({ success: true, user: { id: staffMember.id, name: staffMember.name, email: staffMember.email, role: staffMember.role } });
  });
  app.post("/api/kitchen-portal/logout", (req, res) => {
    res.clearCookie("app_session_id", { ...getSessionCookieOptions(req), maxAge: -1 });
    res.json({ success: true });
  });

  // Standalone Kitchen Portal API. It delegates to the same tRPC procedures as
  // the restaurant application, so orders, inventory, and reports share one DB.
  app.get("/api/kitchen-portal/me", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
  app.get("/api/kitchen-portal/orders", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    const caller = appRouter.createCaller({ req, res, user });
    res.json(await caller.admin.activeOrders({ branchId: 1 }));
  });
  app.post("/api/kitchen-portal/orders/:orderId/status", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    const orderId = Number(req.params.orderId);
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    if (!Number.isInteger(orderId) || !status) {
      res.status(400).json({ error: "Valid order and status are required" });
      return;
    }
    try {
      const caller = appRouter.createCaller({ req, res, user });
      res.json(await caller.admin.updateOrderStatus({ orderId, status: status as any }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Could not update order" });
    }
  });
  app.get("/api/kitchen-portal/inventory", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    const caller = appRouter.createCaller({ req, res, user });
    res.json(await caller.kitchen.allInventory({ branchId: 1 }));
  });
  app.post("/api/kitchen-portal/ingredients", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    try {
      const caller = appRouter.createCaller({ req, res, user });
      res.json(await caller.kitchen.addInventoryItem({ branchId: 1, ...req.body }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Could not add ingredient" });
    }
  });
  app.get("/api/kitchen-portal/purchases", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    const caller = appRouter.createCaller({ req, res, user });
    res.json(await caller.kitchen.recentPurchases({ branchId: 1, limit: Number(req.query.limit) || 20 }));
  });
  app.post("/api/kitchen-portal/purchases", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    try {
      const caller = appRouter.createCaller({ req, res, user });
      res.json(await caller.kitchen.recordIngredientPurchase({ branchId: 1, ...req.body }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Could not record ingredient purchase" });
    }
  });
  app.post("/api/kitchen-portal/inventory/:inventoryId/movement", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    const inventoryId = Number(req.params.inventoryId);
    const quantity = Number(req.body?.quantity);
    const type = typeof req.body?.type === "string" ? req.body.type : "";
    if (!Number.isInteger(inventoryId) || !Number.isFinite(quantity) || quantity === 0 || !type) {
      res.status(400).json({ error: "A valid stock movement is required" });
      return;
    }
    try {
      const caller = appRouter.createCaller({ req, res, user });
      res.json(await caller.kitchen.updateStock({ inventoryId, branchId: 1, quantity, type: type as any, note: typeof req.body?.note === "string" ? req.body.note : undefined }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Could not record stock movement" });
    }
  });
  app.get("/api/kitchen-portal/report", async (req, res) => {
    const user = await getKitchenPortalUser(req, res);
    if (!user) return;
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const caller = appRouter.createCaller({ req, res, user });
    res.json(await caller.kitchen.monthlyReport({ branchId: 1, year, month }));
  });

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
