import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import * as Linking from 'expo-linking';
import { useResponsive } from '@/hooks/use-responsive';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';
import { useWindowDimensions } from 'react-native';

type Period = 'today' | 'week' | 'month' | 'all';

function fmt(n: number | null | undefined) {
  if (n == null) return '₦0';
  return '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AdminFinanceScreen() {
  const { user, logout } = useAuth();
  const [period, setPeriod] = useState<Period>('today');
  const [refreshing, setRefreshing] = useState(false);
  const { colWidth, rf, rp, isTablet } = useResponsive();
  const cardW = colWidth(isTablet ? 4 : 2, 12, 16);
  const { width: screenW } = useWindowDimensions();

  const now = new Date();
  const fromDate = period === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    : period === 'week'
    ? new Date(now.getTime() - 7 * 86400000).toISOString()
    : period === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    : undefined;

  const statsQ = trpc.admin.stats.useQuery({ fromDate }, { refetchInterval: 60_000 });
  const reportQ = trpc.admin.transactionReport.useQuery({ fromDate, limit: 5 }, { staleTime: 30_000 });
  const overviewQ = trpc.admin.overview.useQuery(undefined, { staleTime: 30_000 });
  const dailyQ = trpc.admin.dailyRevenue.useQuery({ days: 7 }, { staleTime: 60_000 });
  const dailyData = dailyQ.data ?? [];

  const stats = statsQ.data;
  const overview = overviewQ.data;
  const recentOrders = reportQ.data?.rows ?? [];
  const summary = reportQ.data?.summary;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([statsQ.refetch(), reportQ.refetch(), overviewQ.refetch(), dailyQ.refetch()]);
    setRefreshing(false);
  };

  const PERIODS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: '7 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <LinearGradient colors={['#0F2A47', '#1A3C5E', '#1E4976']} style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.headerGreeting}>Finance & Operations</Text>
              <Text style={s.headerSub}>Amala Oluyole · {user?.name ?? 'Admin'}</Text>
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <Text style={s.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
          {/* Revenue Hero */}
          <View style={s.revenueHero}>
            <Text style={s.revenueLabel}>Total Revenue</Text>
            <Text style={s.revenueAmount}>{fmt(stats?.totalRevenue)}</Text>
            <Text style={s.revenuePeriod}>
              {period === 'today' ? 'Today' : period === 'week' ? 'Last 7 days' : period === 'month' ? 'This month' : 'All time'}
              {' · '}{stats?.totalOrders ?? 0} orders
            </Text>
          </View>
          {/* Period Selector */}
          <View style={s.periodRow}>
            {PERIODS.map(p => (
              <TouchableOpacity
                key={p.key}
                style={[s.periodBtn, period === p.key && s.periodBtnActive]}
                onPress={() => setPeriod(p.key)}
                activeOpacity={0.8}
              >
                <Text style={[s.periodBtnText, period === p.key && s.periodBtnTextActive]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        {/* KPI Cards */}
        <View style={s.kpiGrid}>

        {/* 7-Day Revenue Chart */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>7-Day Revenue</Text>
          {(() => {
            const chartW = screenW - 32;
            const chartH = 140;
            const paddingLeft = 48;
            const paddingBottom = 28;
            const barAreaW = chartW - paddingLeft - 8;
            const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);
            const barW = Math.floor(barAreaW / 7) - 6;
            const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
            return (
              <Svg width={chartW} height={chartH + paddingBottom}>
                {/* Gridlines */}
                {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                  const y = chartH - frac * chartH;
                  return (
                    <Line key={i} x1={paddingLeft} y1={y} x2={chartW - 4} y2={y} stroke="#E5E7EB" strokeWidth={1} />
                  );
                })}
                {/* Y-axis labels */}
                {[0, 0.5, 1].map((frac, i) => (
                  <SvgText key={i} x={paddingLeft - 4} y={chartH - frac * chartH + 4} fontSize={9} fill="#9BA1A6" textAnchor="end">
                    {frac === 0 ? '0' : frac === 0.5 ? `₦${Math.round(maxRevenue / 2 / 1000)}k` : `₦${Math.round(maxRevenue / 1000)}k`}
                  </SvgText>
                ))}
                {/* Bars */}
                {dailyData.map((d, i) => {
                  const barH = Math.max(2, (d.revenue / maxRevenue) * chartH);
                  const x = paddingLeft + i * (barAreaW / 7) + 3;
                  const y = chartH - barH;
                  const dayLabel = new Date(d.day + 'T12:00:00').toLocaleDateString('en-NG', { weekday: 'short' });
                  const isToday = d.day === new Date().toISOString().split('T')[0];
                  return (
                    <React.Fragment key={d.day}>
                      <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={isToday ? '#D02010' : '#1A3C5E'} opacity={isToday ? 1 : 0.7} />
                      <SvgText x={x + barW / 2} y={chartH + 16} fontSize={9} fill={isToday ? '#D02010' : '#6B7280'} textAnchor="middle" fontWeight={isToday ? 'bold' : 'normal'}>
                        {dayLabel}
                      </SvgText>
                      {d.revenue > 0 && (
                        <SvgText x={x + barW / 2} y={y - 4} fontSize={8} fill="#374151" textAnchor="middle">
                          {d.revenue >= 1000 ? `${Math.round(d.revenue / 1000)}k` : String(Math.round(d.revenue))}
                        </SvgText>
                      )}
                    </React.Fragment>
                  );
                })}
              </Svg>
            );
          })()}
          <Text style={s.chartNote}>Red bar = today · Values in ₦</Text>
        </View>

          {[
            { label: 'Completed', value: String(stats?.completedOrders ?? 0), sub: 'orders', color: '#22C55E' },
            { label: 'Cancelled', value: String(stats?.cancelledOrders ?? 0), sub: 'orders', color: '#EF4444' },
            { label: 'Avg Order', value: fmt(stats?.avgOrderValue), sub: 'per order', color: '#F59E0B' },
            { label: 'Today Orders', value: String(overview?.todayOrders ?? 0), sub: 'new today', color: '#0EA5E9' },
          ].map((kpi, i) => (
            <View key={i} style={s.kpiCard}>
              <View style={[s.kpiDot, { backgroundColor: kpi.color }]} />
              <Text style={s.kpiValue}>{kpi.value}</Text>
              <Text style={s.kpiLabel}>{kpi.label}</Text>
              <Text style={s.kpiSub}>{kpi.sub}</Text>
            </View>
          ))}
        </View>

        {/* Payment Breakdown */}
        {summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Payment Breakdown</Text>
            <View style={s.paymentRow}>
              {[
                { label: 'Card', value: fmt(summary.cardRevenue), color: '#6366F1' },
                { label: 'Transfer', value: fmt(summary.transferRevenue), color: '#0EA5E9' },
                { label: 'Cash', value: fmt(summary.cashRevenue), color: '#22C55E' },
              ].map((p, i) => (
                <View key={i} style={s.paymentCard}>
                  <View style={[s.paymentBar, { backgroundColor: p.color }]} />
                  <Text style={s.paymentValue}>{p.value}</Text>
                  <Text style={s.paymentLabel}>{p.label}</Text>
                </View>
              ))}
            </View>
            <View style={s.paymentStatusRow}>
              <View style={s.paymentStatusItem}>
                <Text style={[s.paymentStatusNum, { color: '#22C55E' }]}>{summary.paidOrders}</Text>
                <Text style={s.paymentStatusLabel}>Paid</Text>
              </View>
              <View style={s.paymentStatusItem}>
                <Text style={[s.paymentStatusNum, { color: '#F59E0B' }]}>{summary.pendingOrders}</Text>
                <Text style={s.paymentStatusLabel}>Pending</Text>
              </View>
              <View style={s.paymentStatusItem}>
                <Text style={[s.paymentStatusNum, { color: '#EF4444' }]}>{summary.failedOrders}</Text>
                <Text style={s.paymentStatusLabel}>Failed</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Restaurant Overview</Text>
          <View style={s.overviewGrid}>
            {[
              { icon: '🍽️', label: 'Total Meals', value: overview?.totalMeals ?? 0 },
              { icon: '🏪', label: 'Branches', value: overview?.totalBranches ?? 0 },
              { icon: '🚴', label: 'Active Riders', value: overview?.totalRiders ?? 0 },
              { icon: '📦', label: 'Total Orders', value: overview?.totalOrders ?? 0 },
            ].map((item, i) => (
              <View key={i} style={s.overviewCard}>
                <Text style={s.overviewIcon}>{item.icon}</Text>
                <Text style={s.overviewValue}>{item.value}</Text>
                <Text style={s.overviewLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(portal-admin)/orders' as any)} activeOpacity={0.7}>
              <Text style={s.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0 ? (
            <Text style={s.emptyText}>No transactions yet</Text>
          ) : (
            recentOrders.map((order: any) => (
              <View key={order.id} style={s.txRow}>
                <View style={s.txLeft}>
                  <Text style={s.txNum}>#{order.orderNumber}</Text>
                  <Text style={s.txDate}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-NG') : ''}</Text>
                </View>
                <View style={s.txRight}>
                  <Text style={s.txAmount}>{fmt(Number(order.total))}</Text>
                  <View style={[s.txBadge, { backgroundColor: order.paymentStatus === 'paid' ? '#DCFCE7' : order.paymentStatus === 'pending' ? '#FEF3C7' : '#FEE2E2' }]}>
                    <Text style={[s.txBadgeText, { color: order.paymentStatus === 'paid' ? '#166534' : order.paymentStatus === 'pending' ? '#92400E' : '#991B1B' }]}>
                      {order.paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <View style={s.actionsGrid}>
            {[
              { label: 'Full Report', icon: '📊', onPress: () => router.push('/admin/transaction-report' as any) },
              { label: 'Kitchen Report', icon: '📋', onPress: () => router.push('/kitchen/monthly-report' as any) },
              { label: 'Rider Tracking', icon: '🗺️', onPress: () => router.push('/admin/rider-tracking' as any) },
              { label: 'Promo Codes', icon: '🏷️', onPress: () => router.push('/(portal-admin)/settings' as any) },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={s.actionCard} onPress={a.onPress} activeOpacity={0.8}>
                <Text style={s.actionIcon}>{a.icon}</Text>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerGreeting: { fontSize: 20, fontWeight: '900', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  revenueHero: { alignItems: 'center', marginBottom: 20 },
  revenueLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  revenueAmount: { fontSize: 42, fontWeight: '900', color: '#FFF', marginTop: 4 },
  revenuePeriod: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  periodRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  periodBtnActive: { backgroundColor: '#FFF' },
  periodBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  periodBtnTextActive: { color: '#1A3C5E' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  kpiCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  kpiDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 2 },
  kpiLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  kpiSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '700', color: '#1A3C5E' },
  paymentRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  paymentCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  paymentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  paymentValue: { fontSize: 16, fontWeight: '800', color: '#111827', marginTop: 8 },
  paymentLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  paymentStatusRow: { flexDirection: 'row', gap: 12 },
  paymentStatusItem: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, alignItems: 'center' },
  paymentStatusNum: { fontSize: 20, fontWeight: '900' },
  paymentStatusLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  overviewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  overviewCard: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  overviewIcon: { fontSize: 28, marginBottom: 6 },
  overviewValue: { fontSize: 22, fontWeight: '900', color: '#111827' },
  overviewLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txLeft: {},
  txNum: { fontSize: 14, fontWeight: '700', color: '#111827' },
  txDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#111827' },
  txBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  txBadgeText: { fontSize: 11, fontWeight: '700' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { backgroundColor: '#F0F4FF', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: '#1A3C5E', textAlign: 'center' },
  chartNote: { fontSize: 11, color: '#9BA1A6', marginTop: 8, textAlign: 'right' },
});
