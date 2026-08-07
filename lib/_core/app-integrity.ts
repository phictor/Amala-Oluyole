import { NativeModules, Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

export type IntegrityOperation =
  | "checkout"
  | "payment.initialize"
  | "payment.verify"
  | "rider.location"
  | "rider.order"
  | "admin";

type IntegrityNativeModule = {
  attest(nonce: string, operation: IntegrityOperation): Promise<string>;
};

function nativeProvider(): IntegrityNativeModule | null {
  return (NativeModules.AmalaIntegrity as IntegrityNativeModule | undefined) ?? null;
}

export async function getIntegrityHeaders(operation: IntegrityOperation | null): Promise<Record<string, string>> {
  if (!operation || Platform.OS === "web") return {};
  if (process.env.EXPO_PUBLIC_INTEGRITY_ENABLED !== "true") return {};
  if (Platform.OS !== "android" && Platform.OS !== "ios") throw new Error("Unsupported integrity platform");
  const token = await Auth.getSessionToken();
  if (!token) throw new Error("Authentication is required");
  const response = await fetch(`${getApiBaseUrl()}/api/integrity/challenge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ platform: Platform.OS, operation }),
  });
  if (!response.ok) throw new Error("Unable to create app-integrity challenge");
  const challenge = await response.json() as { nonce: string };
  const provider = nativeProvider();
  if (!provider) throw new Error("Native app-integrity provider is unavailable");
  const assertion = await provider.attest(challenge.nonce, operation);
  if (!assertion) throw new Error("Native app-integrity assertion was empty");
  return {
    "x-app-integrity-platform": Platform.OS,
    "x-app-integrity-challenge": challenge.nonce,
    "x-app-integrity-assertion": assertion,
  };
}
