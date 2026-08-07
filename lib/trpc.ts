import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { Platform } from "react-native";
import { getIntegrityHeaders, type IntegrityOperation } from "@/lib/_core/app-integrity";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

function webCsrfToken(): string | undefined {
  if (Platform.OS !== "web" || typeof document === "undefined") return undefined;
  return document.cookie.split("; ").find((value) => value.startsWith("app_csrf_token="))?.split("=")[1];
}

async function renewSession(): Promise<string | null | "cookie"> {
  const refreshToken = Platform.OS === "web" ? null : await Auth.getRefreshToken();
  if (Platform.OS !== "web" && !refreshToken) return null;
  const csrf = webCsrfToken();
  const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : {}) },
    body: refreshToken ? JSON.stringify({ refreshToken }) : "{}",
  });
  if (!response.ok) return null;
  if (Platform.OS === "web") return "cookie";
  const pair = await response.json() as { accessToken: string; refreshToken: string };
  await Promise.all([Auth.setSessionToken(pair.accessToken), Auth.setRefreshToken(pair.refreshToken)]);
  return pair.accessToken;
}

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers({ op }) {
          const token = await Auth.getSessionToken();
          const csrf = webCsrfToken();
          const integrityOperation: IntegrityOperation | null =
            op.path === "orders.place" ? "checkout" :
            op.path === "orders.initializePayment" ? "payment.initialize" :
            op.path === "orders.verifyPayment" ? "payment.verify" :
            ["rider.updateLocation", "rider.setStatus"].includes(op.path) ? "rider.location" :
            op.path === "rider.updateOrderStatus" ? "rider.order" :
            op.type === "mutation" && op.path.startsWith("admin.") ? "admin" : null;
          const integrityHeaders = await getIntegrityHeaders(integrityOperation);
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : {}),
            ...integrityHeaders,
          };
        },
        // Custom fetch to include credentials for cookie-based auth
        async fetch(url, options) {
          let response = await fetch(url, {
            ...options,
            credentials: "include",
          });
          if (response.status === 401) {
            const renewed = await renewSession();
            if (renewed) {
              const headers = new Headers(options?.headers);
              if (renewed !== "cookie") headers.set("Authorization", `Bearer ${renewed}`);
              response = await fetch(url, { ...options, headers, credentials: "include" });
            }
          }
          return response;
        },
      }),
    ],
  });
}
