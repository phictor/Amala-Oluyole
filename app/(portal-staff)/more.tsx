import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { clearPersistedSensitiveState, useAppStore } from "@/lib/store/app-store";
import { trpc } from "@/lib/trpc";

const STAFF = "#C45122";

export default function StaffMoreScreen() {
  const { state, dispatch } = useAppStore();
  const [signingOut, setSigningOut] = useState(false);
  const branchesQ = trpc.admin.allBranches.useQuery(undefined, { staleTime: 5 * 60_000 });
  const ordersQ = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 30_000 });
  const displayName = state.user?.name || "Staff team member";

  const signOut = () => {
    Alert.alert("Sign out", "Sign out of the Staff workspace on this device?", [
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
        <Text style={styles.eyebrow}>STAFF WORKSPACE</Text>
        <Text style={styles.title}>More</Text>
        <Text style={styles.subtitle}>Account, operations shortcuts, and support</Text>

        <View style={styles.identityCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text></View>
          <View style={styles.identityCopy}>
            <Text style={styles.name}>{displayName}</Text>
            <Text numberOfLines={1} style={styles.contact}>{state.user?.email || state.user?.phone || "Signed-in staff account"}</Text>
            <View style={styles.roleBadge}>
              <IconSymbol color={STAFF} name="shield.fill" size={13} />
              <Text style={styles.roleText}>{state.user?.role === "admin" ? "Owner · Staff access" : state.user?.role === "manager" ? "Manager" : "Staff"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.coverageCard}>
          <View style={styles.coverageItem}>
            <Text style={styles.coverageValue}>{branchesQ.data?.length ?? "—"}</Text>
            <Text style={styles.coverageLabel}>active branches</Text>
          </View>
          <View style={styles.coverageDivider} />
          <View style={styles.coverageItem}>
            <Text style={styles.coverageValue}>{ordersQ.data?.length ?? "—"}</Text>
            <Text style={styles.coverageLabel}>live orders</Text>
          </View>
        </View>

        {(state.user?.role === "admin" || state.user?.role === "manager") && (
          <>
            <Text style={styles.sectionLabel}>OWNER &amp; MANAGEMENT</Text>
            <View style={styles.menuCard}>
              <MenuRow icon="person.2.fill" label="Administration" onPress={() => router.push("/(portal-admin)" as never)} />
              {state.user.role === "admin" && (
                <MenuRow icon="creditcard.fill" label="Finance workspace" onPress={() => router.push("/(portal-finance)" as never)} />
              )}
              {state.user.role === "admin" && (
                <MenuRow icon="fork.knife" label="Kitchen workspace" onPress={() => router.push("/(portal-kitchen)" as never)} last />
              )}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>OPERATIONS</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="list.bullet.rectangle" label="Open live order board" onPress={() => router.push("/(portal-staff)/orders" as never)} />
          <MenuRow icon="questionmark.circle.fill" label="Help and support" onPress={() => router.push("/support" as never)} />
          <MenuRow icon="info.circle.fill" label="Preview information" onPress={() => router.push("/preview-info" as never)} last />
        </View>

        <View style={styles.boundaryCard}>
          <View style={styles.boundaryIcon}><IconSymbol color={STAFF} name="info.circle.fill" size={22} /></View>
          <View style={styles.boundaryCopy}>
            <Text style={styles.boundaryTitle}>Clear role boundaries</Text>
            <Text style={styles.boundaryBody}>Staff can monitor service flow without financial totals. Kitchen preparation and rider delivery actions stay inside those assigned workspaces.</Text>
          </View>
        </View>

        <TouchableOpacity accessibilityRole="button" disabled={signingOut} onPress={signOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>{signingOut ? "Signing out…" : "Sign out"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

function MenuRow({ icon, label, onPress, last = false }: { icon: "list.bullet.rectangle" | "questionmark.circle.fill" | "info.circle.fill" | "person.2.fill" | "creditcard.fill" | "fork.knife"; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.menuRow, last && styles.menuRowLast]}>
      <View style={styles.menuIcon}><IconSymbol color={STAFF} name={icon} size={20} /></View>
      <Text style={styles.menuText}>{label}</Text>
      <IconSymbol color="#A1958D" name="chevron.right" size={18} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFF8F2" },
  content: { padding: 20, paddingBottom: 115 },
  eyebrow: { color: STAFF, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#33241D", fontSize: 28, fontWeight: "900", marginTop: 4 },
  subtitle: { color: "#83746C", fontSize: 13, marginTop: 5 },
  identityCard: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#EADFD7", borderRadius: 20, borderWidth: 1, flexDirection: "row", marginTop: 24, padding: 17 },
  avatar: { alignItems: "center", backgroundColor: "#FBE5D8", borderRadius: 29, height: 58, justifyContent: "center", width: 58 },
  avatarText: { color: STAFF, fontSize: 23, fontWeight: "900" },
  identityCopy: { flex: 1, marginLeft: 13 },
  name: { color: "#382920", fontSize: 17, fontWeight: "900" },
  contact: { color: "#8B7D75", fontSize: 11, marginTop: 3 },
  roleBadge: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "#FFF0E7", borderRadius: 999, flexDirection: "row", gap: 5, marginTop: 8, paddingHorizontal: 9, paddingVertical: 5 },
  roleText: { color: STAFF, fontSize: 10, fontWeight: "800" },
  coverageCard: { backgroundColor: "#712C17", borderRadius: 18, flexDirection: "row", marginTop: 14, paddingVertical: 17 },
  coverageItem: { alignItems: "center", flex: 1 },
  coverageValue: { color: "#FFFFFF", fontSize: 23, fontWeight: "900" },
  coverageLabel: { color: "#FFD4BE", fontSize: 10, marginTop: 3 },
  coverageDivider: { backgroundColor: "rgba(255,255,255,0.18)", width: 1 },
  sectionLabel: { color: "#8A766B", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 9, marginTop: 26 },
  menuCard: { backgroundColor: "#FFFFFF", borderColor: "#EADFD7", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  menuRow: { alignItems: "center", borderBottomColor: "#F0E7E1", borderBottomWidth: 1, flexDirection: "row", padding: 14 },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { alignItems: "center", backgroundColor: "#FFF0E7", borderRadius: 11, height: 38, justifyContent: "center", width: 38 },
  menuText: { color: "#44352D", flex: 1, fontSize: 14, fontWeight: "700", marginLeft: 12 },
  boundaryCard: { backgroundColor: "#FFF0E7", borderRadius: 18, flexDirection: "row", marginTop: 16, padding: 16 },
  boundaryIcon: { alignItems: "center", height: 32, justifyContent: "center", width: 32 },
  boundaryCopy: { flex: 1, marginLeft: 10 },
  boundaryTitle: { color: "#6C2C17", fontSize: 14, fontWeight: "900" },
  boundaryBody: { color: "#87543E", fontSize: 12, lineHeight: 18, marginTop: 4 },
  signOutButton: { alignItems: "center", backgroundColor: "#FFF1F0", borderColor: "#F1C8C4", borderRadius: 14, borderWidth: 1, marginTop: 24, paddingVertical: 14 },
  signOutText: { color: "#B23B34", fontSize: 14, fontWeight: "800" },
});
