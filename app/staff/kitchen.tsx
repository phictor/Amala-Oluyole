import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import { useAppStore } from "@/lib/store/app-store";
import { setKitchenEntryIntent } from "@/lib/kitchen-entry-intent";

const KITCHEN_ROLES = ["kitchen", "admin", "manager"];

/**
 * Stable browser entry point for the staff-only kitchen portal.
 * Share this URL with kitchen staff: /staff/kitchen.
 */
export default function KitchenWebEntry() {
  const { state, dispatch } = useAppStore();
  const role = state.user?.role ?? "customer";
  const signedIn = state.isAuthenticated && !state.isGuest;
  const ready = state.hydrated && state.authChecked;
  const allowed = signedIn && KITCHEN_ROLES.includes(role);

  useEffect(() => {
    if (ready && allowed) router.replace("/(portal-kitchen)/" as never);
  }, [allowed, ready]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#D02010" />
        <Text style={styles.loadingText}>Opening Kitchen Portal…</Text>
      </View>
    );
  }

  if (!signedIn) {
    return (
      <View style={styles.page}>
        <View style={styles.brandMark}><Text style={styles.brandIcon}>🍲</Text></View>
        <Text style={styles.brand}>Àmàlà Olúyòlé</Text>
        <Text style={styles.title}>Kitchen Portal</Text>
        <Text style={styles.description}>
          For Oluyole Town Planning kitchen staff. Sign in with your work account to view and prepare live orders.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            setKitchenEntryIntent();
            router.push("/auth/login" as never);
          }}
        >
          <Text style={styles.primaryButtonText}>Kitchen Staff Sign In</Text>
        </TouchableOpacity>
        {Platform.OS === "web" && <Text style={styles.hint}>Keep this page bookmarked on the kitchen computer.</Text>}
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.brandMark}><Text style={styles.brandIcon}>🔒</Text></View>
      <Text style={styles.title}>Kitchen access required</Text>
      <Text style={styles.description}>
        This work account is not assigned to the kitchen team. Ask the manager to assign the Kitchen role before trying again.
      </Text>
      <TouchableOpacity
        style={styles.secondaryButton}
          onPress={() => {
            dispatch({ type: "LOGOUT" });
            setKitchenEntryIntent();
            router.replace("/auth/login" as never);
          }}
      >
        <Text style={styles.secondaryButtonText}>Use a different account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F3FB", gap: 12 },
  loadingText: { color: "#201060", fontSize: 15, fontWeight: "600" },
  page: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F3FB", paddingHorizontal: 24 },
  brandMark: { width: 72, height: 72, borderRadius: 22, backgroundColor: "#201060", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  brandIcon: { fontSize: 34 },
  brand: { color: "#201060", fontSize: 18, fontWeight: "800", marginBottom: 10 },
  title: { color: "#201060", fontSize: 28, fontWeight: "800", textAlign: "center" },
  description: { maxWidth: 440, color: "#6B6490", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 12, marginBottom: 24 },
  primaryButton: { width: "100%", maxWidth: 360, backgroundColor: "#D02010", borderRadius: 10, paddingVertical: 15, alignItems: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: { width: "100%", maxWidth: 360, borderColor: "#201060", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  secondaryButtonText: { color: "#201060", fontSize: 15, fontWeight: "700" },
  hint: { color: "#9B94C4", fontSize: 12, textAlign: "center", marginTop: 18 },
});
