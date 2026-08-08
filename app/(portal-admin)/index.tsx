import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AdminMenu } from '@/components/admin-menu';
import { trpc } from '@/lib/trpc';

const PERIODS = ['Today', 'Week', 'Month', 'All'];

function fmt(n: number | null | undefined) {
  if (n == null) return '₦0';
  return '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export default function AdminFinanceScreen() {
  const [period, setPeriod] = useState('Week');
  const now = new Date();
  const fromDate = period === 'Today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    : period === 'Week'
    ? new Date(now.getTime() - 7 * 86400000).toISOString()
    : period === 'Month'
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    : undefined;

  const { data: stats, isLoading, refetch, isRefetching } = trpc.admin.stats.useQuery(undefined as unknown as never,
    { refetchInterval: 60000 }
  );
  const { data: dineIn } = trpc.admin.dineInRevenueSummary.useQuery(undefined, { refetchInterval: 60000 });
  const { data: daily } = trpc.admin.dailyRevenueByType.useQuery(undefined, { refetchInterval: 60000 });
  const { data: activeOrders } = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10000 });

  const pendingCount = activeOrders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = activeOrders?.filter((o: { status: string }) => ['accepted','preparing'].includes(o.status)).length ?? 0;

  const s = stats;

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Finance & Operations</Text>
          <Text style={styles.headerSub}>Amala Oluyole Restaurant</Text>
        </View>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#201060" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* KPI tiles */}
            <View style={styles.grid}>
              <View style={[styles.tile, { backgroundColor: '#201060' }]}>
                <Text style={styles.tileLabel}>Total Revenue</Text>
                <Text style={styles.tileValue}>{fmt(s?.totalRevenue)}</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: '#2A1880' }]}>
                <Text style={styles.tileLabel}>Orders</Text>
                <Text style={styles.tileValue}>{s?.totalOrders ?? 0}</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: '#D02010' }]}>
                <Text style={styles.tileLabel}>Avg Order</Text>
                <Text style={styles.tileValue}>{s?.totalOrders ? fmt((s.totalRevenue ?? 0) / s.totalOrders) : '₦0'}</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: '#1A5C2A' }]}>
                <Text style={styles.tileLabel}>Paid</Text>
                <Text style={styles.tileValue}>{s?.completedOrders ?? 0}</Text>
              </View>
            </View>

            {/* Dine-In Revenue */}
            <Text style={styles.sectionTitle}>Dine-In Revenue</Text>
            <View style={styles.grid}>
              <View style={[styles.tile, { backgroundColor: '#5B2D8E' }]}>
                <Text style={styles.tileLabel}>Today</Text>
                <Text style={styles.tileValue}>{fmt(dineIn?.today)}</Text>
                <Text style={styles.tileSub}>{dineIn?.todayCount ?? 0} orders</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: '#7B3DAE' }]}>
                <Text style={styles.tileLabel}>This Week</Text>
                <Text style={styles.tileValue}>{fmt(dineIn?.thisWeek)}</Text>
                <Text style={styles.tileSub}>{dineIn?.weekCount ?? 0} orders</Text>
              </View>
              <View style={[styles.tile, { backgroundColor: '#9B4DCE', flex: 1 }]}>
                <Text style={styles.tileLabel}>This Month</Text>
                <Text style={styles.tileValue}>{fmt(dineIn?.thisMonth)}</Text>
                <Text style={styles.tileSub}>{dineIn?.monthCount ?? 0} orders</Text>
              </View>
            </View>

            {/* Payment breakdown */}
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.payRow}>
              {[
                { label: 'Completed', value: s?.completedOrders, color: '#201060', isCount: true },
                { label: 'Cancelled', value: s?.cancelledOrders, color: '#D02010', isCount: true },
                { label: 'Avg Value', value: s?.avgOrderValue, color: '#1A5C2A' },
              ].map(m => (
                <View key={m.label} style={[styles.payTile, { borderLeftColor: m.color }]}>
                  <Text style={styles.payLabel}>{m.label}</Text>
                  <Text style={styles.payValue}>{(m as { isCount?: boolean }).isCount ? (m.value ?? 0) : fmt(m.value)}</Text>
                </View>
              ))}
            </View>

            {/* 7-day chart */}
            {daily && daily.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>7-Day Revenue</Text>
                <View style={styles.chartContainer}>
                  {daily.map((d: { day: string; delivery: number; pickup: number; dine_in: number; total: number }, i: number) => {
                    const total = (d.delivery ?? 0) + (d.pickup ?? 0) + (d.dine_in ?? 0);
                    const max = Math.max(...daily.map((x: { delivery: number; pickup: number; dine_in: number; total: number }) => (x.delivery ?? 0) + (x.pickup ?? 0) + (x.dine_in ?? 0)), 1);
                    const h = Math.max((total / max) * 100, 4);
                    const isToday = i === daily.length - 1;
                    return (
                      <View key={d.day} style={styles.barCol}>
                        <View style={[styles.bar, { height: h, backgroundColor: isToday ? '#D02010' : '#201060' }]} />
                        <Text style={styles.barLabel}>{new Date(d.day).toLocaleDateString('en-NG', { weekday: 'short' }).slice(0, 2)}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
      <AdminMenu activeSection="finance" pendingOrders={pendingCount} kitchenOrders={kitchenCount} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  header: { marginBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#201060' },
  headerSub: { fontSize: 14, color: '#6B6490', marginTop: 2 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F4F3FB', borderWidth: 1, borderColor: '#E0DEEF' },
  periodBtnActive: { backgroundColor: '#201060', borderColor: '#201060' },
  periodText: { fontSize: 13, color: '#6B6490', fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  tile: { flex: 1, minWidth: '45%', borderRadius: 14, padding: 16 },
  tileLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 6 },
  tileValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  tileSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#201060', marginBottom: 12 },
  payRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  payTile: { flex: 1, backgroundColor: '#F4F3FB', borderRadius: 12, padding: 12, borderLeftWidth: 4 },
  payLabel: { fontSize: 11, color: '#6B6490', fontWeight: '600', marginBottom: 4 },
  payValue: { fontSize: 15, fontWeight: '700', color: '#201060' },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6, marginBottom: 20, backgroundColor: '#F4F3FB', borderRadius: 14, padding: 12 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '70%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: '#6B6490', marginTop: 4, fontWeight: '600' },
});
