import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "@/components/screen-container";
import { BranchPills, PortalEmptyState, QueryProblem } from "@/components/roles/role-portal-ui";
import { IconSymbol, LoadingState } from "@/components/ui";
import { useAppStore } from "@/lib/store/app-store";
import { trpc } from "@/lib/trpc";

const FINANCE = "#176B73";
const FINANCE_DARK = "#102F3D";

type Period = "today" | "week" | "month";

function money(value: number | string | null | undefined) {
  return `₦${Number(value ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function periodStart(period: Period) {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (period === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default function FinanceOverviewScreen() {
  const { state } = useAppStore();
  const [period, setPeriod] = useState<Period>("today");
  const [branchId, setBranchId] = useState<number | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const fromDate = useMemo(() => periodStart(period), [period]);

  const branchesQ = trpc.admin.allBranches.useQuery(undefined, { staleTime: 5 * 60_000 });
  const statsQ = trpc.admin.stats.useQuery({ branchId, fromDate }, { staleTime: 30_000 });
  const reportQ = trpc.admin.transactionReport.useQuery(
    { branchId, fromDate, limit: 5, offset: 0 },
    { staleTime: 30_000 },
  );

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([branchesQ.refetch(), statsQ.refetch(), reportQ.refetch()]);
    setRefreshing(false);
  };

  if (statsQ.isLoading && reportQ.isLoading) {
    return <LoadingState fullScreen message="Preparing finance overview…" />;
  }

  const stats = statsQ.data;
  const summary = reportQ.data?.summary;
  const transactions = reportQ.data?.rows ?? [];
  const branchName = branchId
    ? branchesQ.data?.find((branch) => branch.id === branchId)?.name ?? "Selected branch"
    : "All branches";

  return (
    <ScreenContainer edges={["top", "left", "right"]} style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl onRefresh={refresh} refreshing={refreshing} tintColor={FINANCE} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[FINANCE_DARK, "#155967", FINANCE]} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>FINANCE WORKSPACE</Text>
              <Text style={styles.heroTitle}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}</Text>
              <Text numberOfLines={1} style={styles.heroSub}>{state.user?.name || "Finance team"} · {branchName}</Text>
            </View>
            <View style={styles.secureBadge}>
              <IconSymbol color="#BDECE8" name="shield.fill" size={16} />
              <Text style={styles.secureText}>Finance only</Text>
            </View>
          </View>

          <Text style={styles.revenueLabel}>Recorded revenue</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.revenueValue}>{money(stats?.totalRevenue)}</Text>
          <Text style={styles.revenueMeta}>{stats?.totalOrders ?? 0} orders in the selected period</Text>

          <View style={styles.periodRow}>
            {([
              ["today", "Today"],
              ["week", "7 days"],
              ["month", "This month"],
            ] as const).map(([value, label]) => (
              <TouchableOpacity
                accessibilityRole="button"
                key={value}
                onPress={() => setPeriod(value)}
                style={[styles.periodButton, period === value && styles.periodButtonActive]}
              >
                <Text style={[styles.periodText, period === value && styles.periodTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.branchSection}>
          <Text style={styles.filterLabel}>BRANCH VIEW</Text>
          <BranchPills accent={FINANCE} branches={branchesQ.data ?? []} onSelect={setBranchId} selectedBranchId={branchId} />
        </View>

        {statsQ.isError || reportQ.isError ? (
          <View style={styles.sectionPad}>
            <QueryProblem
              accent={FINANCE}
              message="Your finance data could not be loaded. No values have been estimated or cached as current."
              onRetry={() => void refresh()}
              title="Finance data is unavailable"
            />
          </View>
        ) : (
          <>
            <View style={styles.metricsGrid}>
              <Metric label="Average order" value={money(stats?.avgOrderValue)} tone="#176B73" />
              <Metric label="Completed" value={String(stats?.completedOrders ?? 0)} tone="#2E7D5B" />
              <Metric label="Cancelled" value={String(stats?.cancelledOrders ?? 0)} tone="#B54747" />
              <Metric label="Awaiting payment" value={String(summary?.pendingOrders ?? 0)} tone="#B7791F" />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>RECONCILIATION</Text>
                  <Text style={styles.sectionTitle}>Payment position</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/(portal-finance)/transactions" as never)}>
                  <Text style={styles.link}>View all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.paymentStrip}>
                <PaymentStatus color="#2E7D5B" label="Paid" value={summary?.paidOrders ?? 0} />
                <View style={styles.divider} />
                <PaymentStatus color="#B7791F" label="Pending" value={summary?.pendingOrders ?? 0} />
                <View style={styles.divider} />
                <PaymentStatus color="#B54747" label="Failed" value={summary?.failedOrders ?? 0} />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionEyebrow}>LATEST ACTIVITY</Text>
                  <Text style={styles.sectionTitle}>Recent transactions</Text>
                </View>
              </View>
              {transactions.length === 0 ? (
                <PortalEmptyState
                  accent={FINANCE}
                  icon="creditcard.fill"
                  message="Transactions will appear here as orders are recorded."
                  title="No transactions in this period"
                />
              ) : (
                <View style={styles.transactionCard}>
                  {transactions.map((transaction, index) => (
                    <View key={transaction.id} style={[styles.transactionRow, index === transactions.length - 1 && styles.transactionRowLast]}>
                      <View style={styles.transactionIcon}>
                        <IconSymbol color={FINANCE} name="list.bullet.rectangle" size={19} />
                      </View>
                      <View style={styles.transactionCopy}>
                        <Text style={styles.transactionNumber}>Order #{transaction.orderNumber}</Text>
                        <Text style={styles.transactionMeta}>
                          {transaction.paymentMethod?.replace(/_/g, " ") ?? "Payment method pending"} · {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "—"}
                        </Text>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={styles.transactionAmount}>{money(transaction.total)}</Text>
                        <Text style={[styles.transactionStatus, { color: transaction.paymentStatus === "paid" ? "#2E7D5B" : transaction.paymentStatus === "failed" ? "#B54747" : "#B7791F" }]}>
                          {transaction.paymentStatus}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: tone }]} />
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PaymentStatus({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.paymentItem}>
      <Text style={[styles.paymentNumber, { color }]}>{value}</Text>
      <Text style={styles.paymentLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#F3F6F8" },
  scrollContent: { paddingBottom: 116 },
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 22, paddingHorizontal: 20, paddingTop: 18 },
  heroTop: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  heroCopy: { flex: 1, paddingRight: 12 },
  eyebrow: { color: "#9DD9D5", fontSize: 10, fontWeight: "900", letterSpacing: 1.3 },
  heroTitle: { color: "#FFFFFF", fontSize: 25, fontWeight: "900", marginTop: 5 },
  heroSub: { color: "#D5E7E9", fontSize: 12, marginTop: 4 },
  secureBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.09)", borderColor: "rgba(255,255,255,0.15)", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 5, paddingHorizontal: 9, paddingVertical: 7 },
  secureText: { color: "#E4F5F3", fontSize: 10, fontWeight: "800" },
  revenueLabel: { color: "#B8D4D7", fontSize: 12, fontWeight: "600", marginTop: 28 },
  revenueValue: { color: "#FFFFFF", fontSize: 38, fontWeight: "900", letterSpacing: -1.2, marginTop: 2 },
  revenueMeta: { color: "#C8DCDE", fontSize: 12, marginTop: 3 },
  periodRow: { backgroundColor: "rgba(2,18,25,0.24)", borderRadius: 14, flexDirection: "row", gap: 4, marginTop: 20, padding: 4 },
  periodButton: { alignItems: "center", borderRadius: 11, flex: 1, paddingVertical: 9 },
  periodButtonActive: { backgroundColor: "#FFFFFF" },
  periodText: { color: "#CFE1E3", fontSize: 12, fontWeight: "700" },
  periodTextActive: { color: FINANCE_DARK },
  branchSection: { paddingHorizontal: 18, paddingTop: 20 },
  filterLabel: { color: "#7B8492", fontSize: 10, fontWeight: "900", letterSpacing: 1.1, marginBottom: 9 },
  sectionPad: { padding: 18 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 18, paddingTop: 18 },
  metricCard: { backgroundColor: "#FFFFFF", borderColor: "#E5EAEE", borderRadius: 17, borderWidth: 1, minWidth: "47%", overflow: "hidden", padding: 15, position: "relative", flex: 1 },
  metricAccent: { borderBottomRightRadius: 6, borderTopRightRadius: 6, bottom: 14, left: 0, position: "absolute", top: 14, width: 3 },
  metricValue: { color: "#172735", fontSize: 21, fontWeight: "900" },
  metricLabel: { color: "#727C89", fontSize: 11, fontWeight: "600", marginTop: 4 },
  section: { paddingHorizontal: 18, paddingTop: 24 },
  sectionHeader: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  sectionEyebrow: { color: FINANCE, fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  sectionTitle: { color: "#172735", fontSize: 19, fontWeight: "900", marginTop: 3 },
  link: { color: FINANCE, fontSize: 12, fontWeight: "800", padding: 4 },
  paymentStrip: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E5EAEE", borderRadius: 18, borderWidth: 1, flexDirection: "row", paddingVertical: 18 },
  paymentItem: { alignItems: "center", flex: 1 },
  paymentNumber: { fontSize: 23, fontWeight: "900" },
  paymentLabel: { color: "#737D8B", fontSize: 11, fontWeight: "600", marginTop: 3 },
  divider: { backgroundColor: "#E7EBEF", height: 34, width: 1 },
  transactionCard: { backgroundColor: "#FFFFFF", borderColor: "#E5EAEE", borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  transactionRow: { alignItems: "center", borderBottomColor: "#EBEEF1", borderBottomWidth: 1, flexDirection: "row", padding: 14 },
  transactionRowLast: { borderBottomWidth: 0 },
  transactionIcon: { alignItems: "center", backgroundColor: "#E9F4F3", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  transactionCopy: { flex: 1, marginLeft: 11 },
  transactionNumber: { color: "#21303D", fontSize: 13, fontWeight: "800" },
  transactionMeta: { color: "#7C8694", fontSize: 10, marginTop: 3, textTransform: "capitalize" },
  transactionRight: { alignItems: "flex-end", marginLeft: 8 },
  transactionAmount: { color: "#172735", fontSize: 13, fontWeight: "900" },
  transactionStatus: { fontSize: 10, fontWeight: "800", marginTop: 3, textTransform: "capitalize" },
});
