import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { clearPersistedSensitiveState, useAppStore } from "@/lib/store/app-store";

const FINANCE = "#176B73";

export default function FinanceAccountScreen() {
  const { state, dispatch } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);
  const displayName = state.user?.name || "Finance team member";

  const signOut = () => {
    Alert.alert("Sign out", "Sign out of the Finance workspace on this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try { await Api.logout(); } catch { /* Always complete local sign-out. */ }
          await Promise.all([Auth.removeSessionToken(), Auth.clearUserInfo(), clearPersistedSensitiveState()]);
          dispatch({ type: "LOGOUT" });
          router.replace("/auth/login" as never);
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>FINANCE WORKSPACE</Text>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Your identity and finance access on this device</Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {state.user?.email ? <Text style={styles.contact}>{state.user.email}</Text> : null}
          {state.user?.phone ? <Text style={styles.contact}>{state.user.phone}</Text> : null}
          <View style={styles.roleBadge}>
            <IconSymbol color={FINANCE} name="shield.fill" size={15} />
            <Text style={styles.roleText}>{state.user?.role === "admin" ? "Owner · Finance access" : "Finance"}</Text>
          </View>
        </View>

        <View style={styles.boundaryCard}>
          <View style={styles.boundaryIcon}>
            <IconSymbol color={FINANCE} name="info.circle.fill" size={22} />
          </View>
          <View style={styles.boundaryCopy}>
            <Text style={styles.boundaryTitle}>A focused workspace</Text>
            <Text style={styles.boundaryBody}>This area contains reporting and reconciliation only. Kitchen, rider, and general staff work remain in their own role-protected workspaces.</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>APP & SUPPORT</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="info.circle.fill" label="Preview information" onPress={() => router.push("/preview-info" as never)} />
          <MenuRow icon="questionmark.circle.fill" label="Help and support" onPress={() => router.push("/support" as never)} last />
        </View>

        <TouchableOpacity accessibilityRole="button" disabled={signingOut} onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

function MenuRow({ icon, label, onPress, last = false }: { icon: "info.circle.fill" | "questionmark.circle.fill"; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.menuRow, last && styles.menuRowLast]}>
      <View style={styles.menuIcon}><IconSymbol color={FINANCE} name={icon} size={20} /></View>
      <Text style={styles.menuText}>{label}</Text>
      <IconSymbol color="#98A1AC" name="chevron.right" size={18} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F3F6F8" },
  content: { padding: 20, paddingBottom: 115 },
  eyebrow: { color: FINANCE, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#172735", fontSize: 28, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#77818E", fontSize: 13, lineHeight: 19, marginTop: 5 },
  identityCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E3E9EC", borderRadius: 22, borderWidth: 1, marginTop: 24, padding: 24 },
  avatar: { alignItems: "center", backgroundColor: "#DCEFED", borderRadius: 35, height: 70, justifyContent: "center", width: 70 },
  avatarText: { color: FINANCE, fontSize: 28, fontWeight: "900" },
  name: { color: "#172735", fontSize: 20, fontWeight: "900", marginTop: 14 },
  contact: { color: "#75808C", fontSize: 12, marginTop: 4 },
  roleBadge: { alignItems: "center", backgroundColor: "#E9F4F3", borderRadius: 999, flexDirection: "row", gap: 6, marginTop: 14, paddingHorizontal: 12, paddingVertical: 7 },
  roleText: { color: FINANCE, fontSize: 11, fontWeight: "800" },
  boundaryCard: { backgroundColor: "#E9F4F3", borderRadius: 18, flexDirection: "row", marginTop: 16, padding: 16 },
  boundaryIcon: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  boundaryCopy: { flex: 1, marginLeft: 10 },
  boundaryTitle: { color: "#123E43", fontSize: 14, fontWeight: "900" },
  boundaryBody: { color: "#41686B", fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionLabel: { color: "#7B8492", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 9, marginTop: 26 },
  menuCard: { backgroundColor: "#FFFFFF", borderColor: "#E3E9EC", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  menuRow: { alignItems: "center", borderBottomColor: "#E9EDF0", borderBottomWidth: 1, flexDirection: "row", padding: 14 },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { alignItems: "center", backgroundColor: "#EAF4F3", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  menuText: { color: "#24333F", flex: 1, fontSize: 14, fontWeight: "700", marginLeft: 12 },
  signOutButton: { alignItems: "center", backgroundColor: "#FFF1F0", borderColor: "#F3C9C6", borderRadius: 14, borderWidth: 1, marginTop: 24, paddingVertical: 14 },
  signOutText: { color: "#B23B34", fontSize: 14, fontWeight: "800" },
});
