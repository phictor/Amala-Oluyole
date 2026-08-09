import { useMemo, useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { BranchPills, PortalEmptyState, QueryProblem } from "@/components/roles/role-portal-ui";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol, LoadingState } from "@/components/ui";
import { trpc } from "@/lib/trpc";

const STAFF = "#C45122";

export default function StaffDispatchScreen() {
  const [branchId, setBranchId] = useState<number | undefined>();
  const [selectedRider, setSelectedRider] = useState<Record<number, number>>({});
  const [refreshing, setRefreshing] = useState(false);
  const utils = trpc.useUtils();
  const branchesQ = trpc.admin.allBranches.useQuery(undefined, { staleTime: 5 * 60_000 });
  const ordersQ = trpc.admin.activeOrders.useQuery({ branchId }, { refetchInterval: 10_000 });
  const ridersQ = trpc.admin.riders.useQuery({ branchId }, { refetchInterval: 20_000 });
  const assignRider = trpc.admin.assignRider.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.admin.activeOrders.invalidate(), utils.admin.riders.invalidate()]);
      Alert.alert("Rider assigned", "The delivery is now visible in the rider workspace.");
    },
    onError: () => Alert.alert("Assignment failed", "Refresh the board and confirm the rider is still available."),
  });

  const readyOrders = useMemo(
    () => (ordersQ.data ?? []).filter((order) => order.status === "ready" && order.orderType === "delivery"),
    [ordersQ.data],
  );
  const availableRiders = useMemo(
    () => (ridersQ.data ?? []).filter(({ rider }) => rider.isActive && rider.isOnline && rider.isAvailable),
    [ridersQ.data],
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([branchesQ.refetch(), ordersQ.refetch(), ridersQ.refetch()]);
    setRefreshing(false);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>STAFF WORKSPACE</Text>
          <Text style={styles.title}>Dispatch</Text>
          <Text style={styles.subtitle}>Match ready deliveries with available riders</Text>
        </View>
        <View style={styles.headerIcon}>
          <IconSymbol color={STAFF} name="bicycle" size={24} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={STAFF} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.filterLabel}>BRANCH</Text>
        <BranchPills accent={STAFF} branches={branchesQ.data ?? []} onSelect={setBranchId} selectedBranchId={branchId} />

        <View style={styles.summaryRow}>
          <Summary label="ready deliveries" value={readyOrders.length} />
          <Summary label="available riders" value={availableRiders.length} />
        </View>

        {ordersQ.isLoading || ridersQ.isLoading ? (
          <LoadingState message="Loading dispatch board..." />
        ) : ordersQ.isError || ridersQ.isError ? (
          <QueryProblem
            accent={STAFF}
            message="Dispatch information could not be loaded. Refresh before assigning a rider."
            onRetry={() => void refresh()}
            title="Dispatch board unavailable"
          />
        ) : readyOrders.length === 0 ? (
          <PortalEmptyState
            accent={STAFF}
            icon="checkmark.circle.fill"
            message="Kitchen-ready delivery orders will appear here automatically."
            title="Nothing is waiting for dispatch"
          />
        ) : (
          <View style={styles.cards}>
            {readyOrders.map((order) => {
              const ridersForOrder = availableRiders.filter(({ rider }) => rider.branchId === order.branchId);
              const chosen = selectedRider[order.id];
              return (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                      <Text style={styles.orderMeta}>
                        {branchesQ.data?.find((branch) => branch.id === order.branchId)?.name ?? `Branch ${order.branchId}`}
                      </Text>
                    </View>
                    <View style={styles.readyBadge}><Text style={styles.readyText}>READY</Text></View>
                  </View>

                  <Text style={styles.chooseLabel}>Choose an available rider</Text>
                  {ridersForOrder.length === 0 ? (
                    <View style={styles.noRiderRow}>
                      <IconSymbol color="#9A6A45" name="info.circle.fill" size={17} />
                      <Text style={styles.noRiderText}>No rider is online and available at this branch.</Text>
                    </View>
                  ) : (
                    <View style={styles.riderList}>
                      {ridersForOrder.map(({ rider, user }) => {
                        const selected = chosen === rider.id;
                        return (
                          <TouchableOpacity
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            key={rider.id}
                            onPress={() => setSelectedRider((current) => ({ ...current, [order.id]: rider.id }))}
                            style={[styles.riderChoice, selected && styles.riderChoiceSelected]}
                          >
                            <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                            <View style={styles.riderCopy}>
                              <Text style={styles.riderName}>{user?.name || `Rider ${rider.id}`}</Text>
                              <Text style={styles.riderMeta}>{rider.vehicleType.replace(/_/g, " ")}{rider.vehiclePlate ? ` · ${rider.vehiclePlate}` : ""}</Text>
                            </View>
                            <View style={styles.onlineDot} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={!chosen || assignRider.isPending}
                    onPress={() => chosen && assignRider.mutate({ orderId: order.id, riderId: chosen })}
                    style={[styles.assignButton, (!chosen || assignRider.isPending) && styles.assignButtonDisabled]}
                  >
                    <Text style={styles.assignText}>{assignRider.isPending ? "Assigning..." : "Assign rider"}</Text>
                    <IconSymbol color="#FFFFFF" name="chevron.right" size={17} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <View style={styles.summary}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFF8F2" },
  header: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#EFE6DF", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 20 },
  eyebrow: { color: STAFF, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#33241D", fontSize: 26, fontWeight: "900", marginTop: 3 },
  subtitle: { color: "#83746C", fontSize: 12, marginTop: 3 },
  headerIcon: { alignItems: "center", backgroundColor: "#FFF0E7", borderRadius: 15, height: 48, justifyContent: "center", width: 48 },
  content: { padding: 18, paddingBottom: 115 },
  filterLabel: { color: "#8A766B", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 9 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 20, marginTop: 18 },
  summary: { backgroundColor: "#FFFFFF", borderColor: "#EBDDD4", borderRadius: 16, borderWidth: 1, flex: 1, padding: 15 },
  summaryValue: { color: "#382920", fontSize: 25, fontWeight: "900" },
  summaryLabel: { color: "#87766C", fontSize: 10, marginTop: 3 },
  cards: { gap: 14 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#EBDDD4", borderRadius: 20, borderWidth: 1, padding: 16 },
  cardTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  orderNumber: { color: "#392A22", fontSize: 16, fontWeight: "900" },
  orderMeta: { color: "#897B73", fontSize: 11, marginTop: 4 },
  readyBadge: { backgroundColor: "#E8F5EE", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  readyText: { color: "#2E7D5B", fontSize: 9, fontWeight: "900" },
  chooseLabel: { color: "#6F5F56", fontSize: 11, fontWeight: "800", marginBottom: 9, marginTop: 18, textTransform: "uppercase" },
  noRiderRow: { alignItems: "center", backgroundColor: "#FFF8E8", borderRadius: 12, flexDirection: "row", gap: 8, padding: 12 },
  noRiderText: { color: "#8A623C", flex: 1, fontSize: 11, lineHeight: 16 },
  riderList: { gap: 8 },
  riderChoice: { alignItems: "center", borderColor: "#E8DED7", borderRadius: 13, borderWidth: 1, flexDirection: "row", padding: 11 },
  riderChoiceSelected: { backgroundColor: "#FFF4EC", borderColor: STAFF },
  radio: { alignItems: "center", borderColor: "#B7AAA2", borderRadius: 9, borderWidth: 1.5, height: 18, justifyContent: "center", width: 18 },
  radioSelected: { borderColor: STAFF },
  radioDot: { backgroundColor: STAFF, borderRadius: 5, height: 9, width: 9 },
  riderCopy: { flex: 1, marginLeft: 10 },
  riderName: { color: "#44342C", fontSize: 13, fontWeight: "800" },
  riderMeta: { color: "#8A7A71", fontSize: 10, marginTop: 2, textTransform: "capitalize" },
  onlineDot: { backgroundColor: "#2E7D5B", borderRadius: 5, height: 9, width: 9 },
  assignButton: { alignItems: "center", backgroundColor: STAFF, borderRadius: 13, flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 14, paddingVertical: 13 },
  assignButtonDisabled: { opacity: 0.42 },
  assignText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
});
