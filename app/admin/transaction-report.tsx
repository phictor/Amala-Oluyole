/**
 * Transaction Report Screen
 *
 * Full-featured financial report for admin/manager roles:
 *   - Date range filter (from/to)
 *   - Summary stat tiles (total orders, revenue, paid/pending/failed)
 *   - Payment method breakdown (card, transfer, cash)
 *   - Paginated order list with status badges
 *   - CSV export
 */
import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, Alert, Platform, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import {
  StatCard, SectionHeader, EmptyState, LoadingState, BadgeChip, ActionButton, InfoRow,
} from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { generatePdf, type PdfSection } from "@/lib/pdf-generator";
import { useRequireRole } from "@/hooks/use-require-role";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(1)}K`;
  return `₦${v.toLocaleString()}`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  paid: "#22C55E",
  failed: "#EF4444",
  refunded: "#6B6490",
};

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#3B82F6",
  preparing: "#8B5CF6",
  ready: "#0EA5E9",
  rider_assigned: "#F97316",
  out_for_delivery: "#0EA5E9",
  delivered: "#22C55E",
  completed: "#22C55E",
  cancelled: "#EF4444",
};

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(rows: any[]) {
  if (!rows.length) { Alert.alert("No Data", "There are no transactions to export."); return; }
  const headers = ["Order #", "Date", "Status", "Payment", "Method", "Reference", "Total", "Type", "Branch"];
  const lines = rows.map(r => [
    r.orderNumber ?? r.id,
    fmtDate(r.createdAt),
    r.status,
    r.paymentStatus,
    r.paymentMethod,
    r.paymentReference ?? "",
    Number(r.total ?? 0).toFixed(2),
    r.orderType,
    r.branchId,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");

  if (Platform.OS === "web") {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    Alert.alert("Export Ready", `${rows.length} transactions ready. CSV export is available on web.`);
  }
}


// ── PDF Export ────────────────────────────────────────────────────────────────
async function exportPDF(
  rows: any[],
  summary: any,
  fromDate: string,
  toDate: string,
) {
  const sections: PdfSection[] = [
    {
      type: "stats",
      title: "Summary",
      stats: [
        { label: "Total Orders", value: Number(summary?.totalOrders ?? 0), color: "#201060" },
        { label: "Revenue", value: fmtCurrency(summary?.totalRevenue), color: "#D02010" },
        { label: "Paid", value: Number(summary?.paidOrders ?? 0), color: "#22C55E" },
        { label: "Pending", value: Number(summary?.pendingOrders ?? 0), color: "#F59E0B" },
        { label: "Failed", value: Number(summary?.failedOrders ?? 0), color: "#EF4444" },
      ],
    },
    {
      type: "stats",
      title: "By Payment Method",
      stats: [
        { label: "Card", value: fmtCurrency(summary?.cardRevenue), color: "#3B82F6" },
        { label: "Transfer", value: fmtCurrency(summary?.transferRevenue), color: "#8B5CF6" },
        { label: "Cash on Delivery", value: fmtCurrency(summary?.cashRevenue), color: "#F97316" },
      ],
    },
    {
      type: "table",
      title: `Transactions (${rows.length})`,
      headers: ["Order #", "Date", "Status", "Payment", "Method", "Total", "Type"],
      colWidths: ["12%", "14%", "14%", "12%", "14%", "14%", "10%"],
      rows: rows.map(r => [
        `#${r.orderNumber ?? r.id}`,
        fmtDate(r.createdAt),
        r.status.replace(/_/g, " "),
        r.paymentStatus,
        r.paymentMethod.replace(/_/g, " "),
        fmtCurrency(r.total),
        r.orderType,
      ]),
    },
    {
      type: "text",
      body: `This report covers transactions from ${fromDate} to ${toDate}. All amounts are in Nigerian Naira (₦). This document is confidential and intended for authorised personnel only.`,
    },
  ];
  await generatePdf({
    title: "Transaction Report",
    subtitle: "Financial Summary & Order Ledger",
    dateRange: `${fromDate} – ${toDate}`,
    sections,
    filename: `transaction_report_${fromDate}_${toDate}`,
  });
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TransactionReport() {
  const { allowed, loading: roleLoading } = useRequireRole(["admin"]);
  if (roleLoading) return <LoadingState fullScreen message="Opening portal..." />;
  if (!allowed) return null;

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [fromDate, setFromDate] = useState(toISODate(firstOfMonth));
  const [toDate, setToDate] = useState(toISODate(now));
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const PAGE_SIZE = 20;

  const { data, isLoading, refetch } = trpc.admin.transactionReport.useQuery(
    { fromDate, toDate, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { retry: 1 },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Transaction Report</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <TouchableOpacity
            onPress={() => exportCSV(rows)}
            style={s.exportBtn}
            activeOpacity={0.75}
          >
            <Text style={s.exportBtnText}>⬇ CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => exportPDF(rows, summary, fromDate, toDate)}
            style={[s.exportBtn, { backgroundColor: "#D02010" }]}
            activeOpacity={0.75}
          >
            <Text style={s.exportBtnText}>⬇ PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Filters */}
      <View style={s.filterRow}>
        <View style={s.filterField}>
          <Text style={s.filterLabel}>From</Text>
          <TextInput
            style={s.filterInput}
            value={fromDate}
            onChangeText={v => { setFromDate(v); setPage(0); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9B94C4"
            returnKeyType="done"
          />
        </View>
        <View style={s.filterField}>
          <Text style={s.filterLabel}>To</Text>
          <TextInput
            style={s.filterInput}
            value={toDate}
            onChangeText={v => { setToDate(v); setPage(0); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9B94C4"
            returnKeyType="done"
          />
        </View>
      </View>

      {isLoading ? (
        <LoadingState fullScreen message="Loading report..." />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D02010" />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Summary Stats */}
              <SectionHeader title="Summary" style={s.sectionHeader} />
              <View style={s.statsRow}>
                <StatCard icon="📦" label="Total Orders" value={Number(summary?.totalOrders ?? 0)} color="#201060" />
                <StatCard icon="💰" label="Revenue" value={fmtCurrency(summary?.totalRevenue)} color="#D02010" />
              </View>
              <View style={[s.statsRow, { marginTop: 10 }]}>
                <StatCard icon="✅" label="Paid" value={Number(summary?.paidOrders ?? 0)} color="#22C55E" />
                <StatCard icon="⏳" label="Pending" value={Number(summary?.pendingOrders ?? 0)} color="#F59E0B" />
                <StatCard icon="❌" label="Failed" value={Number(summary?.failedOrders ?? 0)} color="#EF4444" />
              </View>

              {/* Payment Method Breakdown */}
              <SectionHeader title="By Payment Method" style={[s.sectionHeader, { marginTop: 24 }]} />
              <View style={s.card}>
                <InfoRow label="💳 Card" value={fmtCurrency(summary?.cardRevenue)} />
                <InfoRow label="🏦 Transfer" value={fmtCurrency(summary?.transferRevenue)} />
                <InfoRow label="💵 Cash on Delivery" value={fmtCurrency(summary?.cashRevenue)} bold />
              </View>

              {/* Order List Header */}
              <SectionHeader
                title={`Transactions (${rows.length})`}
                style={[s.sectionHeader, { marginTop: 24 }]}
              />
            </>
          }
          renderItem={({ item }) => (
            <View style={s.txCard}>
              <View style={s.txTop}>
                <Text style={s.txNum}>#{item.orderNumber ?? item.id}</Text>
                <BadgeChip
                  label={item.paymentStatus}
                  color={STATUS_COLOR[item.paymentStatus] ?? "#6B6490"}
                  size="sm"
                />
              </View>
              <View style={s.txMeta}>
                <Text style={s.txDate}>{fmtDate(item.createdAt)}</Text>
                <BadgeChip
                  label={item.status.replace(/_/g, " ")}
                  color={ORDER_STATUS_COLOR[item.status] ?? "#6B6490"}
                  size="sm"
                />
              </View>
              <View style={s.txBottom}>
                <Text style={s.txMethod}>{item.paymentMethod.replace(/_/g, " ")} · {item.orderType}</Text>
                <Text style={s.txTotal}>{fmtCurrency(item.total)}</Text>
              </View>
              {item.paymentReference ? (
                <Text style={s.txRef} numberOfLines={1}>Ref: {item.paymentReference}</Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState emoji="📊" title="No transactions found" subtitle="Adjust the date range to see results." />
          }
          ListFooterComponent={
            rows.length >= PAGE_SIZE ? (
              <View style={s.pagination}>
                <ActionButton
                  label="← Previous"
                  variant="secondary"
                  onPress={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={s.pageBtn}
                />
                <Text style={s.pageNum}>Page {page + 1}</Text>
                <ActionButton
                  label="Next →"
                  variant="secondary"
                  onPress={() => setPage(p => p + 1)}
                  disabled={rows.length < PAGE_SIZE}
                  style={s.pageBtn}
                />
              </View>
            ) : null
          }
        />
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D8D4EE",
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: "#201060", fontWeight: "700" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#201060" },
  exportBtn: {
    backgroundColor: "#201060",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  exportBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F4F3FB",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D8D4EE",
  },
  filterField: { flex: 1 },
  filterLabel: { fontSize: 11, fontWeight: "600", color: "#6B6490", marginBottom: 4 },
  filterInput: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#201060",
    borderWidth: 1.5,
    borderColor: "#D8D4EE",
  },
  listContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: { marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#1A1640",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  txCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#1A1640",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  txTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  txNum: { fontSize: 15, fontWeight: "800", color: "#201060" },
  txMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  txDate: { fontSize: 12, color: "#6B6490" },
  txBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  txMethod: { fontSize: 12, color: "#6B6490", textTransform: "capitalize" },
  txTotal: { fontSize: 16, fontWeight: "800", color: "#D02010" },
  txRef: { fontSize: 10, color: "#9B94C4", marginTop: 4 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    gap: 10,
  },
  pageBtn: { flex: 1 },
  pageNum: { fontSize: 13, fontWeight: "600", color: "#6B6490" },
});
