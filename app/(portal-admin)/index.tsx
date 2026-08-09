import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, RefreshControl,
  ScrollView, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { PortalLayout } from '@/components/portal-layout';
import { trpc } from '@/lib/trpc';

const PERIODS = ['Today', 'Week', 'Month', 'All'];

function fmt(n: number | null | undefined) {
  if (n == null) return '₦0';
  return '₦' + Number(n).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color }]}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </View>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B', accepted: '#201060', preparing: '#3D2FA0',
  ready: '#22C55E', out_for_delivery: '#D02010', delivered: '#6B6490', cancelled: '#EF4444',
};

export default function AdminFinanceScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const [period, setPeriod] = useState('Week');

  const { data: stats, isLoading, refetch, isRefetching } = trpc.admin.stats.useQuery(
    undefined as unknown as never,
    { refetchInterval: 60000 }
  );
  const { data: dineIn } = trpc.admin.dineInRevenueSummary.useQuery(undefined, { refetchInterval: 60000 });
  const { data: daily } = trpc.admin.dailyRevenueByType.useQuery(undefined, { refetchInterval: 60000 });
  const { data: activeOrders } = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10000 });

  const pendingCount = activeOrders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = activeOrders?.filter((o: { status: string }) => ['accepted', 'preparing'].includes(o.status)).length ?? 0;
  const s = stats;

  const chartMax = daily
    ? Math.max(...daily.map((d: { delivery: number; pickup: number; dine_in: number }) =>
        (d.delivery ?? 0) + (d.pickup ?? 0) + (d.dine_in ?? 0)), 1)
    : 1;

  return (
    <PortalLayout
      portal="admin"
      title="Finance & Operations"
      badges={{ orders: pendingCount, kitchen: kitchenCount }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={isDesktop ? styles.desktopContent : styles.mobileContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
      >
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
            {/* KPI Row */}
            <View style={[styles.kpiRow, isDesktop && styles.kpiRowDesktop]}>
              <KpiCard label="Total Revenue" value={fmt(s?.totalRevenue)} color="#201060" />
              <KpiCard label="Total Orders" value={String(s?.totalOrders ?? 0)} color="#D02010" />
              <KpiCard label="Completed" value={String(s?.completedOrders ?? 0)} color="#22C55E" />
              <KpiCard label="Cancelled" value={String(s?.cancelledOrders ?? 0)} color="#F59E0B" />
              <KpiCard label="Avg Order Value" value={fmt(s?.avgOrderValue)} color="#6B6490" />
              <KpiCard label="Dine-In Today" value={fmt(dineIn?.today)} sub={`${dineIn?.todayCount ?? 0} orders`} color="#7B3DAE" />
              <KpiCard label="Dine-In This Week" value={fmt(dineIn?.thisWeek)} sub={`${dineIn?.weekCount ?? 0} orders`} color="#9B4DCE" />
              <KpiCard label="Dine-In This Month" value={fmt(dineIn?.thisMonth)} sub={`${dineIn?.monthCount ?? 0} orders`} color="#B55DEE" />
            </View>

            {/* Two-column on desktop */}
            <View style={[styles.twoCol, isDesktop && styles.twoColDesktop]}>
              {/* Revenue Chart */}
              <View style={[styles.card, isDesktop && styles.cardWide]}>
                <Text style={styles.cardTitle}>7-Day Revenue Breakdown</Text>
                {daily && daily.length > 0 ? (
                  <>
                    <View style={styles.legendRow}>
                      {[{ label: 'Delivery', color: '#201060' }, { label: 'Pickup', color: '#F0C000' }, { label: 'Dine-In', color: '#7B3DAE' }].map(l => (
                        <View key={l.label} style={styles.legendItem}>
                          <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                          <Text style={styles.legendText}>{l.label}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={[styles.chartArea, { height: isDesktop ? 180 : 120 }]}>
                      {daily.map((d: { day: string; delivery: number; pickup: number; dine_in: number }, i: number) => {
                        const total = (d.delivery ?? 0) + (d.pickup ?? 0) + (d.dine_in ?? 0);
                        const maxH = isDesktop ? 160 : 100;
                        const dH = Math.max(((d.delivery ?? 0) / chartMax) * maxH, 0);
                        const pH = Math.max(((d.pickup ?? 0) / chartMax) * maxH, 0);
                        const diH = Math.max(((d.dine_in ?? 0) / chartMax) * maxH, 0);
                        const h = Math.max((total / chartMax) * maxH, 4);
                        const isToday = i === daily.length - 1;
                        return (
                          <View key={d.day} style={styles.barCol}>
                            {total > 0 && <Text style={styles.barValue}>{fmt(total).replace('₦', '')}</Text>}
                            <View style={[styles.stackedBar, { height: h }]}>
                              <View style={{ height: dH, backgroundColor: '#201060' }} />
                              <View style={{ height: pH, backgroundColor: '#F0C000' }} />
                              <View style={{ height: diH, backgroundColor: '#7B3DAE' }} />
                            </View>
                            <Text style={[styles.barLabel, isToday && { color: '#D02010', fontWeight: '700' }]}>
                              {new Date(d.day).toLocaleDateString('en-NG', { weekday: 'short' }).slice(0, 3)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text style={styles.emptyText}>No revenue data yet. Orders will appear here once placed.</Text>
                )}
              </View>

              {/* Live Status */}
              <View style={[styles.card, isDesktop && styles.cardNarrow]}>
                <Text style={styles.cardTitle}>Live Order Status</Text>
                <View style={styles.statusGrid}>
                  {[
                    { label: 'Pending', count: pendingCount, color: '#F59E0B', icon: '⏳' },
                    { label: 'In Kitchen', count: kitchenCount, color: '#201060', icon: '🍲' },
                    { label: 'Ready', count: activeOrders?.filter((o: { status: string }) => o.status === 'ready').length ?? 0, color: '#22C55E', icon: '✅' },
                    { label: 'Out for Delivery', count: activeOrders?.filter((o: { status: string }) => o.status === 'out_for_delivery').length ?? 0, color: '#D02010', icon: '🛵' },
                  ].map(st => (
                    <View key={st.label} style={[styles.statusTile, { borderLeftColor: st.color }]}>
                      <Text style={styles.statusIcon}>{st.icon}</Text>
                      <View>
                        <Text style={[styles.statusCount, { color: st.color }]}>{st.count}</Text>
                        <Text style={styles.statusLabel}>{st.label}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Active Orders Table (desktop only) */}
            {isDesktop && activeOrders && activeOrders.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Active Orders</Text>
                <View style={styles.tableHeader}>
                  {['Order #', 'Customer', 'Type', 'Total', 'Status', 'Time'].map(h => (
                    <Text key={h} style={styles.thCell}>{h}</Text>
                  ))}
                </View>
                {(activeOrders as unknown as { id: number; orderNumber: string; total: string; orderType: string; status: string; createdAt: string; user?: { name: string } }[]).map((o, i) => (
                  <View key={o.id} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                    <Text style={styles.tdCell}>#{o.orderNumber}</Text>
                    <Text style={styles.tdCell}>{o.user?.name ?? '—'}</Text>
                    <Text style={styles.tdCell}>{(o.orderType ?? '').replace(/_/g, ' ')}</Text>
                    <Text style={styles.tdCell}>{fmt(Number(o.total))}</Text>
                    <View style={styles.tdCell}>
                      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[o.status] ?? '#6B6490' }]}>
                        <Text style={styles.statusBadgeText}>{(o.status ?? '').replace(/_/g, ' ')}</Text>
                      </View>
                    </View>
                    <Text style={styles.tdCell}>
                      {new Date(o.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </PortalLayout>
  );
}

const styles = StyleSheet.create({
  desktopContent: { padding: 0, flexGrow: 1 },
  mobileContent: { padding: 16, paddingBottom: 80 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  periodBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F4F3FB', borderWidth: 1, borderColor: '#D8D4EE' },
  periodBtnActive: { backgroundColor: '#201060', borderColor: '#201060' },
  periodText: { fontSize: 13, color: '#6B6490', fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  kpiRowDesktop: { flexWrap: 'nowrap', gap: 14 },
  kpiCard: { flex: 1, minWidth: 130, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 16, borderTopWidth: 3, shadowColor: '#201060', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  kpiLabel: { fontSize: 11, color: '#6B6490', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiSub: { fontSize: 11, color: '#9B94C4', marginTop: 4 },
  twoCol: { gap: 16, marginBottom: 24 },
  twoColDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#201060', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardWide: { flex: 2 },
  cardNarrow: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#201060', marginBottom: 16 },
  emptyText: { color: '#9B94C4', fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#6B6490' },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  stackedBar: { width: '100%', borderRadius: 4, overflow: 'hidden', flexDirection: 'column-reverse' },
  barValue: { fontSize: 9, color: '#6B6490', textAlign: 'center' },
  barLabel: { fontSize: 11, color: '#6B6490' },
  statusGrid: { gap: 10 },
  statusTile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: '#F4F3FB', borderRadius: 8, borderLeftWidth: 3 },
  statusIcon: { fontSize: 20 },
  statusCount: { fontSize: 22, fontWeight: '800' },
  statusLabel: { fontSize: 12, color: '#6B6490' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F4F3FB', borderRadius: 6, paddingVertical: 10, paddingHorizontal: 8, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 4 },
  tableRowAlt: { backgroundColor: '#FAFAFA' },
  thCell: { flex: 1, fontSize: 12, fontWeight: '700', color: '#6B6490', textTransform: 'uppercase', letterSpacing: 0.4 },
  tdCell: { flex: 1, fontSize: 13, color: '#201060' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '600', textTransform: 'capitalize' },
});
