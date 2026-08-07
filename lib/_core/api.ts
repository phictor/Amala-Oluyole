import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

function csrfToken(): string | undefined {
  if (Platform.OS !== "web" || typeof document === "undefined") return undefined;
  return document.cookie.split("; ").find((entry) => entry.startsWith("app_csrf_token="))?.split("=")[1];
}

async function refreshSession(): Promise<boolean> {
  const refreshToken = Platform.OS === "web" ? null : await Auth.getRefreshToken();
  if (Platform.OS !== "web" && !refreshToken) return false;
  const csrf = csrfToken();
  const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": decodeURIComponent(csrf) } : {}) },
    body: refreshToken ? JSON.stringify({ refreshToken }) : "{}",
  });
  if (!response.ok) return false;
  if (Platform.OS !== "web") {
    const pair = await response.json() as { accessToken: string; refreshToken: string };
    await Promise.all([Auth.setSessionToken(pair.accessToken), Auth.setRefreshToken(pair.refreshToken)]);
  }
  return true;
}

export async function apiCall<T>(endpoint: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((options.headers as Record<string, string>) || {}) };
  if (Platform.OS !== "web") {
    const token = await Auth.getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } else {
    const csrf = csrfToken();
    if (csrf) headers["x-csrf-token"] = decodeURIComponent(csrf);
  }
  const cleanBase = getApiBaseUrl().replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const response = await fetch(cleanBase ? `${cleanBase}${cleanEndpoint}` : cleanEndpoint, { ...options, headers, credentials: "include" });
  if (response.status === 401 && retry && !endpoint.endsWith("/api/auth/refresh") && await refreshSession()) return apiCall<T>(endpoint, options, false);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(body.error || body.message || "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return await response.json() as T;
}

export async function exchangeOAuthCode(code: string, state: string): Promise<{ sessionToken: string; user: Auth.User }> {
  const binding = await Auth.getOAuthBinding();
  if (!binding) throw new Error("Sign-in state is missing");
  const result = await apiCall<{ accessToken: string; refreshToken: string; user: Auth.User }>("/api/oauth/mobile", {
    method: "POST",
    body: JSON.stringify({ code, state, binding }),
  });
  await Auth.setRefreshToken(result.refreshToken);
  return { sessionToken: result.accessToken, user: result.user };
}

export async function logout(): Promise<void> {
  const refreshToken = Platform.OS === "web" ? null : await Auth.getRefreshToken();
  await apiCall<void>("/api/auth/logout", {
    method: "POST",
    body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
  });
}

export async function getMe(): Promise<(Auth.User & { lastSignedIn: string }) | null> {
  try {
    const result = await apiCall<{ user: Auth.User & { lastSignedIn: string } }>("/api/auth/me");
    return result.user || null;
  } catch { return null; }
}

export async function establishSession(token: string): Promise<boolean> {
  try {
    await apiCall("/api/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    return true;
  } catch { return false; }
}
