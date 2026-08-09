import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { BranchPills, PortalEmptyState, QueryProblem } from "@/components/roles/role-portal-ui";
import { IconSymbol, LoadingState } from "@/components/ui";
import { trpc } from "@/lib/trpc";

const STAFF = "#C45122";

type FlowFilter = "all" | "new" | "kitchen" | "ready" | "delivery";

const FILTER_STATUSES: Record<Exclude<FlowFilter, "all">, string[]> = {
  new: ["payment_confirmed"],
  kitchen: ["accepted", "preparing"],
  ready: ["ready"],
  delivery: ["rider_assigned", "out_for_delivery"],
};

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

export default function StaffOrdersScreen() {
  const [branchId, setBranchId] = useState<number | undefined>();
  const [flow, setFlow] = useState<FlowFilter>("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const branchesQ = trpc.admin.allBranches.useQuery(undefined, { staleTime: 5 * 60_000 });
  const ordersQ = trpc.admin.activeOrders.useQuery({ branchId }, { refetchInterval: 10_000 });

  const orders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (ordersQ.data ?? []).filter((order) => {
      const flowMatch = flow === "all" || FILTER_STATUSES[flow].includes(order.status);
      const searchMatch = !normalizedSearch
        || order.orderNumber.toLowerCase().includes(normalizedSearch)
        || order.items.some((item) => item.name.toLowerCase().includes(normalizedSearch));
      return flowMatch && searchMatch;
    });
  }, [flow, ordersQ.data, search]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([branchesQ.refetch(), ordersQ.refetch()]);
    setRefreshing(false);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>STAFF WORKSPACE</Text>
          <Text style={styles.title}>Live orders</Text>
          <Text style={styles.subtitle}>Operational view · refreshes automatically</Text>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={STAFF} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.filterLabel}>BRANCH</Text>
        <BranchPills accent={STAFF} branches={branchesQ.data ?? []} onSelect={setBranchId} selectedBranchId={branchId} />

        <View style={styles.searchBox}>
          <IconSymbol color="#8A7B73" name="magnifyingglass" size={20} />
          <TextInput
            accessibilityLabel="Search live orders"
            autoCapitalize="none"
            onChangeText={setSearch}
            placeholder="Order number or meal"
            placeholderTextColor="#A49A94"
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setSearch("")}>
              <IconSymbol color="#9B8E86" name="xmark.circle.fill" size={20} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.flowRow} horizontal showsHorizontalScrollIndicator={false}>
          {(["all", "new", "kitchen", "ready", "delivery"] as FlowFilter[]).map((value) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={value}
              onPress={() => setFlow(value)}
              style={[styles.flowButton, flow === value && styles.flowButtonActive]}
            >
              <Text style={[styles.flowText, flow === value && styles.flowTextActive]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.resultHeader}>
          <Text style={styles.resultCount}>{orders.length} {orders.length === 1 ? "order" : "orders"}</Text>
          <Text style={styles.resultHint}>No revenue shown</Text>
        </View>

        {ordersQ.isLoading ? (
          <LoadingState message="Loading order board…" />
        ) : ordersQ.isError ? (
          <QueryProblem
            accent={STAFF}
            message="Live operations could not be loaded. Retry before acting on an order."
            onRetry={() => void ordersQ.refetch()}
            title="Order board unavailable"
          />
        ) : orders.length === 0 ? (
          <PortalEmptyState
            accent={STAFF}
            icon="list.bullet.rectangle"
            message="Try another branch, flow stage, or search term."
            title="No matching active orders"
          />
        ) : (
          <View style={styles.cards}>
            {orders.map((order) => {
              const color = STATUS_COLORS[order.status] ?? "#697386";
              const branch = branchesQ.data?.find((item) => item.id === order.branchId)?.name;
              return (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
                      <Text style={styles.orderTime}>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) : "Time unavailable"}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${color}14` }]}>
                      <View style={[styles.statusDot, { backgroundColor: color }]} />
                      <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[order.status] ?? order.status.replace(/_/g, " ")}</Text>
                    </View>
                  </View>

                  <View style={styles.contextRow}>
                    <View style={styles.contextItem}>
                      <IconSymbol color="#7F7068" name="building.2.fill" size={15} />
                      <Text numberOfLines={1} style={styles.contextText}>{branch || `Branch ${order.branchId}`}</Text>
                    </View>
                    <View style={styles.contextItem}>
                      <IconSymbol color="#7F7068" name={order.orderType === "delivery" ? "bicycle" : "bag.fill"} size={15} />
                      <Text style={styles.contextText}>{order.orderType.replace(/_/g, " ")}</Text>
                    </View>
                  </View>

                  <View style={styles.itemsBlock}>
                    {order.items.length === 0 ? (
                      <Text style={styles.noItems}>Item details are not available.</Text>
                    ) : (
                      order.items.map((item, index) => (
                        <View key={`${order.id}-${index}`} style={styles.itemRow}>
                          <Text style={styles.quantity}>{item.quantity}×</Text>
                          <View style={styles.itemCopy}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            {item.specialInstructions ? <Text numberOfLines={2} style={styles.itemNote}>{item.specialInstructions}</Text> : null}
                          </View>
                        </View>
                      ))
                    )}
                  </View>

                  <Text style={styles.readOnlyNote}>Status actions stay with the assigned kitchen or rider role.</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FFF8F2" },
  header: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#EFE6DF", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: 18, paddingHorizontal: 20, paddingTop: 16 },
  eyebrow: { color: STAFF, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#33241D", fontSize: 26, fontWeight: "900", marginTop: 3 },
  subtitle: { color: "#83746C", fontSize: 12, marginTop: 3 },
  liveBadge: { alignItems: "center", backgroundColor: "#EDF8F2", borderRadius: 999, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { backgroundColor: "#2E7D5B", borderRadius: 4, height: 8, width: 8 },
  liveText: { color: "#2E7D5B", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  content: { padding: 18, paddingBottom: 115 },
  filterLabel: { color: "#8A766B", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 9 },
  searchBox: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E8DED7", borderRadius: 14, borderWidth: 1, flexDirection: "row", marginTop: 18, paddingHorizontal: 13 },
  searchInput: { color: "#392A22", flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 13 },
  flowRow: { gap: 8, paddingRight: 4, paddingTop: 12 },
  flowButton: { backgroundColor: "#FFFFFF", borderColor: "#E4D9D1", borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  flowButtonActive: { backgroundColor: STAFF, borderColor: STAFF },
  flowText: { color: "#74655D", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  flowTextActive: { color: "#FFFFFF" },
  resultHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 11, marginTop: 20 },
  resultCount: { color: "#44342C", fontSize: 13, fontWeight: "800" },
  resultHint: { color: "#9A8D85", fontSize: 10, fontWeight: "600" },
  cards: { gap: 12 },
  card: { backgroundColor: "#FFFFFF", borderColor: "#EBDDD4", borderRadius: 19, borderWidth: 1, padding: 15 },
  cardTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  orderNumber: { color: "#392A22", fontSize: 15, fontWeight: "900" },
  orderTime: { color: "#94877F", fontSize: 10, marginTop: 3 },
  statusBadge: { alignItems: "center", borderRadius: 999, flexDirection: "row", gap: 5, marginLeft: 8, paddingHorizontal: 9, paddingVertical: 6 },
  statusDot: { borderRadius: 4, height: 7, width: 7 },
  statusText: { fontSize: 9, fontWeight: "900" },
  contextRow: { borderBottomColor: "#F0E8E2", borderBottomWidth: 1, flexDirection: "row", gap: 18, marginTop: 14, paddingBottom: 12 },
  contextItem: { alignItems: "center", flexDirection: "row", gap: 5, maxWidth: "58%" },
  contextText: { color: "#74655D", fontSize: 10, fontWeight: "600", textTransform: "capitalize" },
  itemsBlock: { gap: 9, paddingTop: 12 },
  itemRow: { alignItems: "flex-start", flexDirection: "row" },
  quantity: { color: STAFF, fontSize: 12, fontWeight: "900", width: 27 },
  itemCopy: { flex: 1 },
  itemName: { color: "#44352D", fontSize: 12, fontWeight: "700" },
  itemNote: { color: "#9A5A3B", fontSize: 10, fontStyle: "italic", lineHeight: 15, marginTop: 2 },
  noItems: { color: "#94877F", fontSize: 11 },
  readOnlyNote: { color: "#9A8B83", fontSize: 9, lineHeight: 14, marginTop: 14 },
});
