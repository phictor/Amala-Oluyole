import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { BranchPills, PortalEmptyState, QueryProblem } from "@/components/roles/role-portal-ui";
import { IconSymbol, LoadingState } from "@/components/ui";
import { trpc } from "@/lib/trpc";

const FINANCE = "#176B73";
type PaymentFilter = "all" | "paid" | "pending" | "failed" | "refunded";

function money(value: number | string | null | undefined) {
  return `₦${Number(value ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export default function FinanceTransactionsScreen() {
  const [branchId, setBranchId] = useState<number | undefined>();
  const [status, setStatus] = useState<PaymentFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const branchesQ = trpc.admin.allBranches.useQuery(undefined, { staleTime: 5 * 60_000 });
  const reportQ = trpc.admin.transactionReport.useQuery(
    { branchId, limit: 50, offset: 0 },
    { staleTime: 20_000 },
  );

  const rows = useMemo(() => {
    const all = reportQ.data?.rows ?? [];
    return status === "all" ? all : all.filter((row) => row.paymentStatus === status);
  }, [reportQ.data?.rows, status]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([branchesQ.refetch(), reportQ.refetch()]);
    setRefreshing(false);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FINANCE WORKSPACE</Text>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>Reconcile recorded order payments</Text>
        </View>
        <View style={styles.headerIcon}>
          <IconSymbol color={FINANCE} name="creditcard.fill" size={24} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={FINANCE} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.filterLabel}>BRANCH</Text>
        <BranchPills accent={FINANCE} branches={branchesQ.data ?? []} onSelect={setBranchId} selectedBranchId={branchId} />

        <Text style={[styles.filterLabel, styles.statusLabel]}>PAYMENT STATUS</Text>
        <ScrollView contentContainerStyle={styles.filterRow} horizontal showsHorizontalScrollIndicator={false}>
          {(["all", "paid", "pending", "failed", "refunded"] as PaymentFilter[]).map((value) => (
            <TouchableOpacity
              accessibilityRole="button"
              key={value}
              onPress={() => setStatus(value)}
              style={[styles.statusFilter, status === value && styles.statusFilterActive]}
            >
              <Text style={[styles.statusFilterText, status === value && styles.statusFilterTextActive]}>{value}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {reportQ.data?.summary ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>TOTAL RECORDED</Text>
                <Text style={styles.summaryValue}>{money(reportQ.data.summary.totalRevenue)}</Text>
              </View>
              <Text style={styles.summaryCount}>{reportQ.data.summary.totalOrders} orders</Text>
            </View>
            <View style={styles.summaryBreakdown}>
              <Method label="Card" value={reportQ.data.summary.cardRevenue} />
              <Method label="Transfer" value={reportQ.data.summary.transferRevenue} />
              <Method label="Cash" value={reportQ.data.summary.cashRevenue} />
            </View>
          </View>
        ) : null}

        {reportQ.isLoading ? (
          <LoadingState message="Loading transactions…" />
        ) : reportQ.isError ? (
          <QueryProblem
            accent={FINANCE}
            message="The transaction register could not be loaded. Pull down or retry when the connection is stable."
            onRetry={() => void reportQ.refetch()}
            title="Transaction register unavailable"
          />
        ) : rows.length === 0 ? (
          <PortalEmptyState
            accent={FINANCE}
            icon="creditcard.fill"
            message="Try another branch or payment status."
            title="No matching transactions"
          />
        ) : (
          <View style={styles.list}>
            {rows.map((row, index) => {
              const statusColor = row.paymentStatus === "paid" ? "#2E7D5B" : row.paymentStatus === "failed" ? "#B54747" : row.paymentStatus === "refunded" ? "#6C5AA7" : "#B7791F";
              return (
                <View key={row.id} style={[styles.row, index === rows.length - 1 && styles.rowLast]}>
                  <View style={[styles.rowMark, { backgroundColor: `${statusColor}16` }]}>
                    <View style={[styles.rowDot, { backgroundColor: statusColor }]} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.orderNumber}>Order #{row.orderNumber}</Text>
                    <Text style={styles.rowMeta}>
                      {row.createdAt ? new Date(row.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Date unavailable"}
                    </Text>
                    <Text style={styles.method}>{row.paymentMethod?.replace(/_/g, " ") ?? "Method pending"}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.amount}>{money(row.total)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusColor}14` }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{row.paymentStatus}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Method({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.methodColumn}>
      <Text style={styles.methodValue}>{money(value)}</Text>
      <Text style={styles.methodLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F3F6F8" },
  header: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#E8ECEF", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: 18, paddingHorizontal: 20, paddingTop: 16 },
  eyebrow: { color: FINANCE, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  title: { color: "#172735", fontSize: 26, fontWeight: "900", marginTop: 3 },
  subtitle: { color: "#77818E", fontSize: 12, marginTop: 3 },
  headerIcon: { alignItems: "center", backgroundColor: "#E9F4F3", borderRadius: 18, height: 52, justifyContent: "center", width: 52 },
  content: { padding: 18, paddingBottom: 115 },
  filterLabel: { color: "#7B8492", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 9 },
  statusLabel: { marginTop: 20 },
  filterRow: { gap: 8, paddingRight: 4 },
  statusFilter: { backgroundColor: "#FFFFFF", borderColor: "#D9E0E8", borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  statusFilterActive: { backgroundColor: FINANCE, borderColor: FINANCE },
  statusFilterText: { color: "#566074", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  statusFilterTextActive: { color: "#FFFFFF" },
  summaryCard: { backgroundColor: "#123845", borderRadius: 20, marginVertical: 20, padding: 17 },
  summaryTop: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: "#9CCFD0", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  summaryValue: { color: "#FFFFFF", fontSize: 28, fontWeight: "900", marginTop: 4 },
  summaryCount: { color: "#C8E1E1", fontSize: 11, fontWeight: "700", marginBottom: 4 },
  summaryBreakdown: { borderTopColor: "rgba(255,255,255,0.14)", borderTopWidth: 1, flexDirection: "row", marginTop: 16, paddingTop: 14 },
  methodColumn: { flex: 1 },
  methodValue: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  methodLabel: { color: "#9FC4C7", fontSize: 9, marginTop: 3 },
  list: { backgroundColor: "#FFFFFF", borderColor: "#E4E9ED", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  row: { alignItems: "center", borderBottomColor: "#E9EDF0", borderBottomWidth: 1, flexDirection: "row", padding: 14 },
  rowLast: { borderBottomWidth: 0 },
  rowMark: { alignItems: "center", borderRadius: 13, height: 42, justifyContent: "center", width: 42 },
  rowDot: { borderRadius: 5, height: 10, width: 10 },
  rowCopy: { flex: 1, marginLeft: 11 },
  orderNumber: { color: "#1D2C39", fontSize: 13, fontWeight: "800" },
  rowMeta: { color: "#84909D", fontSize: 10, marginTop: 3 },
  method: { color: "#637080", fontSize: 10, fontWeight: "600", marginTop: 2, textTransform: "capitalize" },
  rowRight: { alignItems: "flex-end", marginLeft: 8 },
  amount: { color: "#172735", fontSize: 14, fontWeight: "900" },
  statusBadge: { borderRadius: 999, marginTop: 5, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase" },
});
