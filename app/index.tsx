import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { routeForRole } from "@/lib/auth/role-routing";
import { useAppStore } from "@/lib/store/app-store";

const LOGO = require("@/assets/images/logo-chef.png");

export default function EntryScreen() {
  const { state } = useAppStore();
  const routed = useRef(false);

  useEffect(() => {
    if (!state.hydrated || !state.authResolved || routed.current) return;
    routed.current = true;

    if (state.isAuthenticated && state.user) {
      const destination = state.user.role === "customer" && !state.selectedBranch
        ? "/branch-select"
        : routeForRole(state.user.role);
      router.replace(destination as never);
      return;
    }

    if (state.isGuest) {
      router.replace((state.selectedBranch ? "/(tabs)/home" : "/branch-select") as never);
      return;
    }

    router.replace((state.hasSeenOnboarding ? "/auth/login" : "/onboarding") as never);
  }, [state.authResolved, state.hasSeenOnboarding, state.hydrated, state.isAuthenticated, state.isGuest, state.selectedBranch, state.user]);

  return (
    <View style={styles.container} accessibilityLabel="Preparing Amala Oluyole">
      <View style={styles.logoWrap}>
        <ExpoImage source={LOGO} style={styles.logo} contentFit="contain" />
      </View>
      <Text style={styles.brand}>Amala Oluyole</Text>
      <Text style={styles.message}>Preparing your experience</Text>
      <ActivityIndicator color="#D02010" size="small" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF9F3",
    padding: 24,
  },
  logoWrap: {
    width: 112,
    height: 112,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#34140F",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  logo: { width: 92, height: 92 },
  brand: { marginTop: 22, color: "#201060", fontSize: 27, fontWeight: "900" },
  message: { marginTop: 8, color: "#6B6490", fontSize: 14 },
  loader: { marginTop: 22 },
});
