import "dotenv/config";
import crypto from "crypto";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { and, eq } from "drizzle-orm";
import { orders, riders } from "../../drizzle/schema";
import { appRouter } from "../routers";
import { getAllRiders, getDb } from "../db";
import { confirmVerifiedPayment } from "../payments/service";
import { createIntegrityChallenge, type IntegrityPlatform } from "../security/app-integrity";
import type { PaystackTransaction } from "../payments/paystack";
import { createContext } from "./context";
import { validateProductionEnvironment } from "./env";
import { installHttpSecurity, productionErrorHandler } from "./http-security";
import { registerOAuthRoutes } from "./oauth";
import { sdk, type AuthenticatedUser } from "./sdk";
import { registerStorageProxy } from "./storageProxy";

type SseClient = { res: express.Response; user: AuthenticatedUser; orderId?: number };
const sseClients = new Set<SseClient>();
const TRACKABLE = ["rider_assigned", "out_for_delivery"] as const;

async function riderSnapshot(client: SseClient) {
  const db = await getDb();
  if (!db) return { type: "riderLocations", riders: [], ts: Date.now() };
  if (client.user.role === "admin" || client.user.role === "manager") {
    const all = await getAllRiders();
    return {
      type: "riderLocations",
      riders: all.map(({ rider, user }) => ({
        rider: {
          id: rider.id, branchId: rider.branchId, vehicleType: rider.vehicleType, vehiclePlate: rider.vehiclePlate,
          isOnline: rider.isOnline, isAvailable: rider.isAvailable, currentLatitude: rider.currentLatitude,
          currentLongitude: rider.currentLongitude, lastLocationUpdate: rider.lastLocationUpdate,
          totalDeliveries: rider.totalDeliveries, rating: rider.rating, ratingCount: rider.ratingCount,
        },
        user: user ? { name: user.name } : null,
      })),
      ts: Date.now(),
    };
  }
  if (!client.orderId) throw new Error("Order-scoped tracking is required");
  const [delivery] = await db.select({
    id: riders.id,
    latitude: riders.currentLatitude,
    longitude: riders.currentLongitude,
    lastUpdate: riders.lastLocationUpdate,
  }).from(orders).innerJoin(riders, eq(riders.id, orders.riderId)).where(and(
    eq(orders.id, client.orderId), eq(orders.userId, client.user.id), eq(orders.orderType, "delivery"),
  )).limit(1);
  const [order] = await db.select({ status: orders.status }).from(orders).where(and(eq(orders.id, client.orderId), eq(orders.userId, client.user.id))).limit(1);
  if (!delivery || !order || !TRACKABLE.includes(order.status as typeof TRACKABLE[number])) throw new Error("Tracking unavailable");
  return { type: "riderLocation", orderId: client.orderId, location: delivery, ts: Date.now() };
}

setInterval(async () => {
  for (const client of sseClients) {
    try { client.res.write(`data: ${JSON.stringify(await riderSnapshot(client))}\n\n`); }
    catch { client.res.end(); sseClients.delete(client); }
  }
}, 3_000).unref();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3_000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port += 1) if (await isPortAvailable(port)) return port;
  throw new Error("No API port is available");
}

function verifyPaystackSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function startServer() {
  validateProductionEnvironment();
  const app = express();
  const server = createServer(app);
  installHttpSecurity(app);

  app.post("/api/paystack/webhook", express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
    const signature = typeof req.headers["x-paystack-signature"] === "string" ? req.headers["x-paystack-signature"] : "";
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!verifyPaystackSignature(rawBody, signature, secret)) return void res.status(401).json({ error: "Invalid signature" });
    try {
      const event = JSON.parse(rawBody.toString("utf8")) as { event?: string; data?: PaystackTransaction };
      if (event.event !== "charge.success") return void res.sendStatus(200);
      const orderId = Number(event.data?.metadata?.orderId);
      if (!Number.isInteger(orderId) || !event.data) return void res.status(400).json({ error: "Invalid event" });
      await confirmVerifiedPayment(orderId, event.data);
      res.sendStatus(200);
    } catch {
      res.status(400).json({ error: "Webhook could not be processed" });
    }
  });

  app.use("/api/trpc/admin.uploadMealImage", express.json({ limit: "8mb", strict: true }));
  app.use(express.json({ limit: "1mb", strict: true }));
  app.use(express.urlencoded({ limit: "64kb", extended: true, parameterLimit: 100 }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/integrity/challenge", async (req, res) => {
    let user: AuthenticatedUser;
    try { user = await sdk.authenticateRequest(req); }
    catch { return void res.status(401).json({ error: "Authentication required" }); }
    const allowedOperations = new Set(["checkout", "payment.initialize", "payment.verify", "rider.location", "rider.order", "admin"]);
    const platform = req.body?.platform as IntegrityPlatform;
    const operation = typeof req.body?.operation === "string" ? req.body.operation : "";
    if ((platform !== "android" && platform !== "ios") || !allowedOperations.has(operation)) {
      return void res.status(400).json({ error: "Invalid integrity challenge request" });
    }
    try { res.json(await createIntegrityChallenge(user.id, platform, operation)); }
    catch { res.status(503).json({ error: "Integrity challenge unavailable" }); }
  });
  app.get("/api/health", (_req, res) => res.json({ ok: true, timestamp: Date.now() }));

  app.get("/api/riders/live", async (req, res) => {
    let user: AuthenticatedUser;
    try { user = await sdk.authenticateRequest(req); }
    catch { return void res.status(401).json({ error: "Authentication required" }); }
    const parsedOrderId = typeof req.query.orderId === "string" ? Number(req.query.orderId) : undefined;
    const client: SseClient = { res, user, orderId: Number.isInteger(parsedOrderId) ? parsedOrderId : undefined };
    try {
      const initial = await riderSnapshot(client);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      res.write(`data: ${JSON.stringify(initial)}\n\n`);
      sseClients.add(client);
      req.on("close", () => sseClients.delete(client));
    } catch { res.status(403).json({ error: "Tracking unavailable" }); }
  });

  app.use("/api/trpc", createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, ctx }) {
      console.warn(JSON.stringify({ event: "trpc_error", requestId: ctx?.res.locals.requestId, code: error.code }));
    },
  }));
  app.use(productionErrorHandler);

  const preferredPort = Number.parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);
  server.listen(port, () => console.log(`[api] server listening on port ${port}`));
  return server;
}

if (process.env.NODE_ENV !== "test") startServer().catch(() => {
  console.error("[api] failed to start");
  process.exitCode = 1;
});
