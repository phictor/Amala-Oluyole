import { createContext, useContext } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type KitchenBranch = { id: number; name: string };

type KitchenWorkspaceValue = {
  branchId: number;
  branches: KitchenBranch[];
  canSwitchBranches: boolean;
  setBranchId: (branchId: number) => void;
};

const KitchenWorkspaceContext = createContext<KitchenWorkspaceValue | null>(null);

export function KitchenWorkspaceProvider({ children, value }: { children: React.ReactNode; value: KitchenWorkspaceValue }) {
  return <KitchenWorkspaceContext.Provider value={value}>{children}</KitchenWorkspaceContext.Provider>;
}

export function useKitchenWorkspace(): KitchenWorkspaceValue {
  const value = useContext(KitchenWorkspaceContext);
  if (!value) throw new Error("Kitchen workspace is unavailable");
  return value;
}

export function KitchenBranchPicker() {
  const { branchId, branches, canSwitchBranches, setBranchId } = useKitchenWorkspace();
  const selected = branches.find((branch) => branch.id === branchId);

  if (!canSwitchBranches || branches.length <= 1) {
    return (
      <View style={styles.assignedBranch}>
        <Text style={styles.branchLabel}>ASSIGNED BRANCH</Text>
        <Text style={styles.assignedName}>{selected?.name ?? "Kitchen branch"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.picker}>
      <Text style={[styles.branchLabel, styles.pickerLabel]}>WORKING BRANCH</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {branches.map((branch) => {
          const active = branch.id === branchId;
          return (
            <TouchableOpacity accessibilityRole="button" key={branch.id} onPress={() => setBranchId(branch.id)} style={[styles.pill, active && styles.pillActive]}>
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{branch.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  assignedBranch: { backgroundColor: "#FFFBEB", borderBottomColor: "#FDE68A", borderBottomWidth: 1, paddingHorizontal: 20, paddingVertical: 10 },
  assignedName: { color: "#78350F", fontSize: 13, fontWeight: "800", marginTop: 2 },
  branchLabel: { color: "#A16207", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  picker: { borderBottomColor: "#F3F4F6", borderBottomWidth: 1, paddingBottom: 10, paddingTop: 8 },
  pickerLabel: { paddingHorizontal: 16, paddingBottom: 7 },
  pills: { gap: 8, paddingHorizontal: 16 },
  pill: { backgroundColor: "#F3F4F6", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  pillActive: { backgroundColor: "#D97706" },
  pillText: { color: "#6B7280", fontSize: 12, fontWeight: "700" },
  pillTextActive: { color: "#FFFFFF" },
});
