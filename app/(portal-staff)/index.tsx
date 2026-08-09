import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { BranchPills, PortalEmptyState, QueryProblem } from "@/components/roles/role-portal-ui";
import { IconSymbol, LoadingState } from "@/components/ui";
import { useAppStore } from "@/lib/store/app-store";
import { trpc } from "@/lib/trpc";

const STAFF = "#C45122";
const STAFF_DARK = "#6D2A15";

const STATUS_LABELS: Record<string, string> = {
  payment_confirmed: "New order",
  accepted: "Accepted",
  preparing: "In kitchen",
  ready: "Ready",
  rider_assigned: "Rider assigned",
  out_for_delivery: "On the way",
};

const STATUS_COLORS: Record<string, string> = {
  payment_confirmed: "#C45122",
  accepted: "#2563A6",
  preparing: "#7C4DAB",
  ready: "#2E7D5B",
  rider_assigned: "#287F8B",
  out_for_delivery: "#176B73",
};

export default function StaffTodayScreen() {
  const { state } = useAppStore();
  const [branchId, setBranchId] = useState<number | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const branchesQ = trpc.admin.allBranches.useQuery(undefined, { staleTime: 5 * 60_000 });
  const ordersQ = trpc.admin.activeOrders.useQuery({ branchId }, { refetchInterval: 15_000 });
  const orders = ordersQ.data ?? [];

  const counts = {
    new: orders.filter((order) => order.status === "payment_confirmed").length,
    kitchen: orders.filter((order) => ["accepted", "preparing"].includes(order.status)).length,
    ready: orders.filter((order) => order.status === "ready").length,
    delivery: orders.filter((order) => ["rider_assigned", "out_for_delivery"].includes(order.status)).length,
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([branchesQ.refetch(), ordersQ.refetch()]);
    setRefreshing(false);
  };

  if (ordersQ.isLoading) return <LoadingState fullScreen message="Preparing today’s operations…" />;

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={STAFF} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[STAFF_DARK, "#9A3B19", STAFF]} style={styles.hero}>
          <Text style={styles.eyebrow}>STAFF WORKSPACE</Text>
          <Text style={styles.title}>Today at a glance</Text>
          <Text numberOfLines={1} style={styles.heroSub}>{state.user?.name || "Operations team"} · Live service flow</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live order updates</Text>
          </View>
          <View style={styles.heroCountRow}>
            <View>
              <Text style={styles.heroCount}>{orders.length}</Text>
              <Text style={styles.heroCountLabel}>active orders</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" onPress={() => router.push("/(portal-staff)/orders" as never)} style={styles.openOrdersButton}>
              <Text style={styles.openOrdersText}>Open order board</Text>
              <IconSymbol color="#FFFFFF" name="chevron.right" size={17} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.branchBlock}>
          <Text style={styles.filterLabel}>BRANCH VIEW</Text>
          <BranchPills accent={STAFF} branches={branchesQ.data ?? []} onSelect={setBranchId} selectedBranchId={branchId} />
        </View>

        {ordersQ.isError ? (
          <View style={styles.sectionPad}>
            <QueryProblem
              accent={STAFF}
              message="Live orders could not be loaded. No operational status has been assumed."
              onRetry={() => void ordersQ.refetch()}
              title="Order flow unavailable"
            />
          </View>
        ) : (
          <>
            <View style={styles.flowGrid}>
              <FlowCard color="#C45122" icon="bell.fill" label="New" value={counts.new} />
              <FlowCard color="#7C4DAB" icon="fork.knife" label="In kitchen" value={counts.kitchen} />
              <FlowCard color="#2E7D5B" icon="checkmark.circle.fill" label="Ready" value={counts.ready} />
              <FlowCard color="#287F8B" icon="bicycle" label="Delivery" value={counts.delivery} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>SERVICE FLOW</Text>
                  <Text style={styles.sectionTitle}>Needs attention</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/(portal-staff)/orders" as never)}>
                  <Text style={styles.link}>View all</Text>
                </TouchableOpacity>
              </View>
              {orders.length === 0 ? (
                <PortalEmptyState
                  accent={STAFF}
                  message="There are no active orders for this branch right now."
                  title="Service is clear"
                />
              ) : (
                <View style={styles.orderList}>
                  {orders.slice(0, 6).map((order, index) => {
                    const color = STATUS_COLORS[order.status] ?? "#697386";
                    const branch = branchesQ.data?.find((item) => item.id === order.branchId)?.name;
                    return (
                      <View key={order.id} style={[styles.orderRow, index === Math.min(orders.length, 6) - 1 && styles.orderRowLast]}>
                        <View style={[styles.orderMark, { backgroundColor: `${color}16` }]}>
                          <View style={[styles.orderDot, { backgroundColor: color }]} />
                        </View>
                        <View style={styles.orderCopy}>
                          <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                          <Text style={styles.orderMeta}>{branch || `Branch ${order.branchId}`} · {order.orderType.replace(/_/g, " ")}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: `${color}14` }]}>
                          <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ")}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function FlowCard({ color, icon, label, value }: { color: string; icon: "bell.fill" | "fork.knife" | "checkmark.circle.fill" | "bicycle"; label: string; value: number }) {
  return (
    <View style={styles.flowCard}>
      <View style={[styles.flowIcon, { backgroundColor: `${color}14` }]}>
        <IconSymbol color={color} name={icon} size={20} />
      </View>
      <Text style={styles.flowValue}>{value}</Text>
      <Text style={styles.flowLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFF8F2" },
  content: { paddingBottom: 115 },
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 22, paddingHorizontal: 20, paddingTop: 18 },
  eyebrow: { color: "#FFD5BC", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  title: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", marginTop: 5 },
  heroSub: { color: "#FFE1D1", fontSize: 12, marginTop: 4 },
  liveBadge: { alignItems: "center", alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, flexDirection: "row", gap: 6, marginTop: 18, paddingHorizontal: 10, paddingVertical: 6 },
  liveDot: { backgroundColor: "#A7F3D0", borderRadius: 4, height: 8, width: 8 },
  liveText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  heroCountRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  heroCount: { color: "#FFFFFF", fontSize: 38, fontWeight: "900", lineHeight: 40 },
  heroCountLabel: { color: "#FFD9C4", fontSize: 11, marginTop: 2 },
  openOrdersButton: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.14)", borderColor: "rgba(255,255,255,0.24)", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  openOrdersText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  branchBlock: { paddingHorizontal: 18, paddingTop: 20 },
  filterLabel: { color: "#8A766B", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 9 },
  sectionPad: { padding: 18 },
  flowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 18, paddingTop: 18 },
  flowCard: { backgroundColor: "#FFFFFF", borderColor: "#EFE4DB", borderRadius: 17, borderWidth: 1, flex: 1, minWidth: "47%", padding: 15 },
  flowIcon: { alignItems: "center", borderRadius: 11, height: 36, justifyContent: "center", width: 36 },
  flowValue: { color: "#33241D", fontSize: 25, fontWeight: "900", marginTop: 10 },
  flowLabel: { color: "#807168", fontSize: 11, fontWeight: "600", marginTop: 2 },
  section: { paddingHorizontal: 18, paddingTop: 24 },
  sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  sectionEyebrow: { color: STAFF, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  sectionTitle: { color: "#33241D", fontSize: 19, fontWeight: "900", marginTop: 3 },
  link: { color: STAFF, fontSize: 12, fontWeight: "800", padding: 4 },
  orderList: { backgroundColor: "#FFFFFF", borderColor: "#EFE4DB", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  orderRow: { alignItems: "center", borderBottomColor: "#F0E8E1", borderBottomWidth: 1, flexDirection: "row", padding: 14 },
  orderRowLast: { borderBottomWidth: 0 },
  orderMark: { alignItems: "center", borderRadius: 12, height: 38, justifyContent: "center", width: 38 },
  orderDot: { borderRadius: 5, height: 10, width: 10 },
  orderCopy: { flex: 1, marginLeft: 10 },
  orderNumber: { color: "#392A22", fontSize: 13, fontWeight: "800" },
  orderMeta: { color: "#8A7C73", fontSize: 10, marginTop: 3, textTransform: "capitalize" },
  statusBadge: { borderRadius: 999, marginLeft: 8, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: "900" },
});
