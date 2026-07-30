/**
 * Kitchen Monthly Report Screen
 *
 * Displays a full monthly performance report for the kitchen:
 *   - Summary stats (orders, revenue, completion rate, avg order value)
 *   - Daily order bar chart (visual bars scaled to max)
 *   - Top 10 most ordered meals
 *   - Order type breakdown (delivery vs pickup)
 *   - Low stock alerts
 */
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, FlatList,
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import {
  StatCard, SectionHeader, EmptyState, LoadingState, BadgeChip,
} from "@/components/ui";
import { trpc } from "@/lib/trpc";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(1)}K`;
  return `₦${v.toLocaleString()}`;
}

export default function KitchenMonthlyReport() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [refreshing, setRefreshing] = useState(false);

  // Use branchId=1 as default; in production this comes from the user's profile
  const branchId = 1;

  const { data, isLoading, refetch } = trpc.kitchen.monthlyReport.useQuery(
    { branchId, year, month },
    { retry: 1 },
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1)) return;
    setMonth(nextM);
    setYear(nextY);
  }

  const summary = data?.summary;
  const dailyOrders = data?.dailyOrders ?? [];
  const topMeals = data?.topMeals ?? [];
  const orderTypeBreakdown = data?.orderTypeBreakdown ?? [];
  const lowStockItems = data?.lowStockItems ?? [];

  const maxDailyCount = Math.max(...dailyOrders.map(d => Number(d.count)), 1);
  const completionRate = summary && Number(summary.totalOrders) > 0
    ? Math.round((Number(summary.completedOrders) / Number(summary.totalOrders)) * 100)
    : 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Monthly Report</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Month Selector */}
      <View style={s.monthSelector}>
        <TouchableOpacity onPress={prevMonth} style={s.monthArrow} activeOpacity={0.7}>
          <Text style={s.monthArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthLabel}>{MONTH_NAMES[month - 1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.monthArrow} activeOpacity={0.7}>
          <Text style={s.monthArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingState fullScreen message="Loading report..." />
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D02010" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Stats */}
          <SectionHeader title="Summary" style={s.sectionHeader} />
          <View style={s.statsRow}>
            <StatCard icon="📦" label="Total Orders" value={Number(summary?.totalOrders ?? 0)} color="#201060" />
            <StatCard icon="💰" label="Revenue" value={fmt(summary?.totalRevenue)} color="#D02010" />
          </View>
          <View style={[s.statsRow, { marginTop: 10 }]}>
            <StatCard icon="✅" label="Completion" value={`${completionRate}%`} color="#22C55E" />
            <StatCard icon="🧾" label="Avg Order" value={fmt(summary?.avgOrderValue)} color="#F0C000" />
          </View>
          <View style={[s.statsRow, { marginTop: 10 }]}>
            <StatCard icon="❌" label="Cancelled" value={Number(summary?.cancelledOrders ?? 0)} color="#EF4444" />
            <View style={{ flex: 1 }} />
          </View>

          {/* Daily Orders Bar Chart */}
          <SectionHeader title="Daily Orders" style={[s.sectionHeader, { marginTop: 24 }]} />
          {dailyOrders.length === 0 ? (
            <EmptyState emoji="📊" title="No data for this period" />
          ) : (
            <View style={s.chartContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.chartBars}>
                  {dailyOrders.map((d, i) => {
                    const heightPct = (Number(d.count) / maxDailyCount);
                    const barHeight = Math.max(heightPct * 120, 4);
                    const dayNum = new Date(d.day).getDate();
                    return (
                      <View key={i} style={s.barWrapper}>
                        <Text style={s.barValue}>{d.count}</Text>
                        <View style={[s.bar, { height: barHeight }]} />
                        <Text style={s.barLabel}>{dayNum}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Order Type Breakdown */}
          <SectionHeader title="Order Types" style={[s.sectionHeader, { marginTop: 24 }]} />
          <View style={s.card}>
            {orderTypeBreakdown.length === 0 ? (
              <EmptyState emoji="🍽️" title="No orders this period" />
            ) : (
              orderTypeBreakdown.map((t, i) => (
                <View key={i} style={s.typeRow}>
                  <Text style={s.typeIcon}>{t.orderType === "delivery" ? "🛵" : "🏠"}</Text>
                  <Text style={s.typeLabel}>{t.orderType === "delivery" ? "Delivery" : "Pickup"}</Text>
                  <BadgeChip
                    label={`${t.count} orders`}
                    color={t.orderType === "delivery" ? "#0EA5E9" : "#22C55E"}
                  />
                </View>
              ))
            )}
          </View>

          {/* Top Meals */}
          <SectionHeader title="Top Meals" style={[s.sectionHeader, { marginTop: 24 }]} />
          {topMeals.length === 0 ? (
            <EmptyState emoji="🍲" title="No meal data this period" />
          ) : (
            <View style={s.card}>
              {topMeals.map((m, i) => (
                <View key={i} style={[s.mealRow, i < topMeals.length - 1 && s.mealRowBorder]}>
                  <View style={s.mealRank}>
                    <Text style={s.mealRankText}>#{i + 1}</Text>
                  </View>
                  <View style={s.mealInfo}>
                    <Text style={s.mealName} numberOfLines={1}>{m.mealName}</Text>
                    <Text style={s.mealSub}>{m.totalQuantity} sold · {fmt(m.totalRevenue)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <>
              <SectionHeader
                title={`Low Stock Alerts (${lowStockItems.length})`}
                style={[s.sectionHeader, { marginTop: 24 }]}
              />
              <View style={s.card}>
                {lowStockItems.map((item, i) => (
                  <View key={item.id} style={[s.stockRow, i < lowStockItems.length - 1 && s.stockRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.stockName}>{item.name}</Text>
                      <Text style={s.stockSub}>
                        {item.currentStock} {item.unit} remaining · min {item.minimumStock} {item.unit}
                      </Text>
                    </View>
                    <BadgeChip label="Low Stock" color="#EF4444" size="sm" />
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
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
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 20,
    backgroundColor: "#F4F3FB",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#D8D4EE",
  },
  monthArrow: { padding: 8 },
  monthArrowText: { fontSize: 24, color: "#201060", fontWeight: "700" },
  monthLabel: { fontSize: 17, fontWeight: "800", color: "#201060", minWidth: 180, textAlign: "center" },
  scroll: { padding: 16 },
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
  chartContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#1A1640",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    minHeight: 160,
    paddingBottom: 4,
  },
  barWrapper: { alignItems: "center", gap: 4, minWidth: 28 },
  barValue: { fontSize: 9, color: "#6B6490", fontWeight: "600" },
  bar: { width: 20, backgroundColor: "#D02010", borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, color: "#6B6490" },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEF8",
  },
  typeIcon: { fontSize: 20 },
  typeLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: "#201060" },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  mealRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEF8",
  },
  mealRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F3FB",
    alignItems: "center",
    justifyContent: "center",
  },
  mealRankText: { fontSize: 12, fontWeight: "800", color: "#201060" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: "700", color: "#201060" },
  mealSub: { fontSize: 12, color: "#6B6490", marginTop: 2 },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  stockRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0EEF8",
  },
  stockName: { fontSize: 14, fontWeight: "700", color: "#201060" },
  stockSub: { fontSize: 12, color: "#6B6490", marginTop: 2 },
});
