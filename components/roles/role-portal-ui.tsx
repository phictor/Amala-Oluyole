import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from "@/components/ui";

export type PortalBranch = { id: number; name: string };

export function RolePortalGate({
  loading,
  allowed,
  workspace,
  accent,
  children,
}: {
  loading: boolean;
  allowed: boolean;
  workspace: string;
  accent: string;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <View style={styles.gate}>
        <ActivityIndicator color={accent} size="large" />
        <Text style={styles.gateTitle}>Preparing your workspace</Text>
        <Text style={styles.gateBody}>Checking your account access securely.</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.gate}>
        <View style={[styles.gateIcon, { backgroundColor: `${accent}16` }]}>
          <IconSymbol color={accent} name="shield.fill" size={30} />
        </View>
        <Text style={styles.gateTitle}>{workspace} access is restricted</Text>
        <Text style={styles.gateBody}>This account does not have permission to use this workspace.</Text>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.85}
          onPress={() => router.replace("/" as never)}
          style={[styles.gateButton, { backgroundColor: accent }]}
        >
          <Text style={styles.gateButtonText}>Return to my workspace</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

export function BranchPills({
  branches,
  selectedBranchId,
  onSelect,
  accent,
  dark = false,
}: {
  branches: PortalBranch[];
  selectedBranchId?: number;
  onSelect: (branchId?: number) => void;
  accent: string;
  dark?: boolean;
}) {
  const choices: (PortalBranch | { id: undefined; name: string })[] = [
    { id: undefined, name: "All branches" },
    ...branches,
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.pillsContent}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {choices.map((branch) => {
        const selected = branch.id === selectedBranchId;
        return (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            key={branch.id ?? "all"}
            onPress={() => onSelect(branch.id)}
            style={[
              styles.pill,
              dark && styles.pillDark,
              selected && { backgroundColor: accent, borderColor: accent },
            ]}
          >
            <Text style={[styles.pillText, dark && styles.pillTextDark, selected && styles.pillTextSelected]}>
              {branch.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function QueryProblem({
  title,
  message,
  accent,
  onRetry,
}: {
  title: string;
  message: string;
  accent: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.problem}>
      <View style={[styles.problemIcon, { backgroundColor: `${accent}14` }]}>
        <IconSymbol color={accent} name="exclamationmark.triangle.fill" size={24} />
      </View>
      <Text style={styles.problemTitle}>{title}</Text>
      <Text style={styles.problemBody}>{message}</Text>
      <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={[styles.retryButton, { borderColor: accent }]}>
        <IconSymbol color={accent} name="arrow.clockwise" size={16} />
        <Text style={[styles.retryText, { color: accent }]}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

export function PortalEmptyState({
  title,
  message,
  accent,
  icon = "checkmark.circle.fill",
}: {
  title: string;
  message: string;
  accent: string;
  icon?: "checkmark.circle.fill" | "list.bullet.rectangle" | "creditcard.fill";
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: `${accent}12` }]}>
        <IconSymbol color={accent} name={icon} size={28} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  gateIcon: { alignItems: "center", borderRadius: 28, height: 56, justifyContent: "center", marginBottom: 18, width: 56 },
  gateTitle: { color: "#172033", fontSize: 20, fontWeight: "800", marginTop: 18, textAlign: "center" },
  gateBody: { color: "#667085", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 360, textAlign: "center" },
  gateButton: { borderRadius: 14, marginTop: 22, paddingHorizontal: 22, paddingVertical: 14 },
  gateButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  pillsContent: { gap: 8, paddingRight: 4 },
  pill: { backgroundColor: "#FFFFFF", borderColor: "#D9E0E8", borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  pillDark: { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.22)" },
  pillText: { color: "#566074", fontSize: 12, fontWeight: "700" },
  pillTextDark: { color: "#E5EAF0" },
  pillTextSelected: { color: "#FFFFFF" },
  problem: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E5E9EF", borderRadius: 18, borderWidth: 1, padding: 24 },
  problemIcon: { alignItems: "center", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  problemTitle: { color: "#172033", fontSize: 16, fontWeight: "800", marginTop: 13, textAlign: "center" },
  problemBody: { color: "#697386", fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
  retryButton: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 7, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10 },
  retryText: { fontSize: 13, fontWeight: "800" },
  empty: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E7EAF0", borderRadius: 18, borderWidth: 1, paddingHorizontal: 24, paddingVertical: 32 },
  emptyIcon: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  emptyTitle: { color: "#172033", fontSize: 16, fontWeight: "800", marginTop: 14, textAlign: "center" },
  emptyBody: { color: "#697386", fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: "center" },
});
