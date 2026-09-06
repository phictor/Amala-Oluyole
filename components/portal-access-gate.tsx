import { useEffect } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";

import { useAppStore } from "@/lib/store/app-store";
import type { PortalType } from "@/components/portal-layout";

const ROLES_BY_PORTAL: Record<PortalType, string[]> = {
  admin: ["admin", "manager"],
  kitchen: ["kitchen", "admin", "manager"],
  rider: ["rider", "admin", "manager"],
};

/** Blocks unauthenticated and unauthorised visitors before any staff portal is rendered. */
export function PortalAccessGate({ portal, children }: { portal: PortalType; children: React.ReactNode }) {
  const { state } = useAppStore();
  const role = state.user?.role ?? "customer";
  const signedIn = state.isAuthenticated && !state.isGuest;
  const authorised = signedIn && ROLES_BY_PORTAL[portal].includes(role);
  const isReady = state.hydrated && state.authChecked;

  useEffect(() => {
    if (!isReady) return;
    if (!signedIn) {
      router.replace("/auth/login" as never);
      return;
    }
    if (!authorised) router.replace("/(tabs)" as never);
  }, [authorised, isReady, signedIn]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F3FB" }}>
        <Text style={{ color: "#201060", fontSize: 15 }}>Checking access…</Text>
      </View>
    );
  }

  if (!authorised) return null;
  return <>{children}</>;
}
