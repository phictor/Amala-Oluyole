import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PortalLayout } from '@/components/portal-layout';
import { trpc } from '@/lib/trpc';
import { generatePdf, type PdfSection } from '@/lib/pdf-generator';

const OLUYOLE_BRANCH_ID = 1;

export default function KitchenReportScreen() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading, refetch, isRefetching } = trpc.kitchen.monthlyReport.useQuery({ month, year, branchId: OLUYOLE_BRANCH_ID });
  const monthName = new Date(year, month - 1).toLocaleString('en-NG', { month: 'long', year: 'numeric' });
  const moveMonth = (direction: -1 | 1) => {
    const next = new Date(year, month - 1 + direction, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
  };
  const exportReport = async () => {
    if (!data) return;
    const sections: PdfSection[] = [
      {
        type: 'stats',
        stats: [
          { label: 'Orders', value: data.summary?.totalOrders ?? 0 },
          { label: 'Revenue', value: `₦${Number(data.summary?.totalRevenue ?? 0).toLocaleString()}` },
          { label: 'Completed', value: data.summary?.completedOrders ?? 0 },
          { label: 'Cancelled', value: data.summary?.cancelledOrders ?? 0 },
        ],
      },
      {
        type: 'table',
        title: 'Daily production',
        headers: ['Date', 'Orders', 'Revenue'],
        rows: (data.dailyOrders ?? []).map((day: { day: string; count: number | string; revenue: number | string }) => [
          new Date(day.day).toLocaleDateString('en-NG', { day: '2-digit', month: 'short' }),
          day.count,
          `₦${Number(day.revenue ?? 0).toLocaleString()}`,
        ]),
      },
      {
        type: 'table',
        title: 'Most ordered meals',
        headers: ['Meal', 'Portions', 'Revenue'],
        rows: (data.topMeals ?? []).map((meal: { mealName: string; totalQuantity: number | string; totalRevenue: number | string }) => [
          meal.mealName,
          meal.totalQuantity,
          `₦${Number(meal.totalRevenue ?? 0).toLocaleString()}`,
        ]),
      },
    ];
    await generatePdf({
      title: 'Oluyole Kitchen Monthly Report',
      subtitle: 'Oluyole Town Planning',
      dateRange: monthName,
      filename: `oluyole-kitchen-${year}-${String(month).padStart(2, '0')}`,
      sections,
    });
  };

  return (
    <PortalLayout portal="kitchen" title="Oluyole Kitchen Report">
      <View style={styles.page}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.heading}>Kitchen monthly report</Text>
            <Text style={styles.subheading}>Oluyole Town Planning branch</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshButton} onPress={() => refetch()} disabled={isRefetching}>
              <Text style={styles.refreshText}>{isRefetching ? 'Refreshing…' : 'Refresh'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exportButton} onPress={exportReport} disabled={!data}>
              <Text style={styles.exportText}>Export PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.monthControl}>
          <TouchableOpacity style={styles.monthButton} onPress={() => moveMonth(-1)}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity>
          <Text style={styles.monthText}>{monthName}</Text>
          <TouchableOpacity style={styles.monthButton} onPress={() => moveMonth(1)}><Text style={styles.monthArrow}>›</Text></TouchableOpacity>
        </View>
        {isLoading ? <ActivityIndicator color="#201060" style={{ marginTop: 32 }} /> : (
          <>
            <View style={styles.kpiGrid}>
              <Metric label="Orders" value={String(data?.summary?.totalOrders ?? 0)} />
              <Metric label="Revenue" value={`₦${Number(data?.summary?.totalRevenue ?? 0).toLocaleString()}`} />
              <Metric label="Average order" value={`₦${Number(data?.summary?.avgOrderValue ?? 0).toLocaleString()}`} />
              <Metric label="Completed" value={String(data?.summary?.completedOrders ?? 0)} />
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Most ordered meals</Text>
              {(data?.topMeals ?? []).map((meal: { mealName: string; totalQuantity: number }, index: number) => (
                <View key={`${meal.mealName}-${index}`} style={styles.mealRow}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  <Text style={styles.mealName}>{meal.mealName}</Text>
                  <Text style={styles.mealQty}>{meal.totalQuantity} portions</Text>
                </View>
              ))}
              {!data?.topMeals?.length && <Text style={styles.empty}>No completed meal data for this month yet.</Text>}
            </View>
            <View style={styles.twoColumn}>
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.sectionTitle}>Daily production</Text>
                {(data?.dailyOrders ?? []).slice(-7).map((day: { day: string; count: number | string; revenue: number | string }) => (
                  <View key={day.day} style={styles.compactRow}>
                    <Text style={styles.rowName}>{new Date(day.day).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</Text>
                    <Text style={styles.rowValue}>{day.count} orders · ₦{Number(day.revenue ?? 0).toLocaleString()}</Text>
                  </View>
                ))}
                {!data?.dailyOrders?.length && <Text style={styles.empty}>No orders recorded for this month yet.</Text>}
              </View>
              <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.sectionTitle}>Order mix</Text>
                {(data?.orderTypeBreakdown ?? []).map((row: { orderType: string; count: number | string }) => (
                  <View key={row.orderType} style={styles.compactRow}>
                    <Text style={styles.rowName}>{row.orderType.replace('_', ' ')}</Text>
                    <Text style={styles.rowValue}>{row.count} orders</Text>
                  </View>
                ))}
                {!data?.orderTypeBreakdown?.length && <Text style={styles.empty}>No order type data for this month yet.</Text>}
              </View>
            </View>
            <View style={[styles.card, data?.lowStockItems?.length ? styles.lowStockCard : undefined]}>
              <Text style={styles.sectionTitle}>Low-stock watch</Text>
              {(data?.lowStockItems ?? []).map((item: { id: number; name: string; currentStock: number | string; minimumStock: number | string; unit: string }) => (
                <View key={item.id} style={styles.compactRow}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.lowValue}>{item.currentStock} {item.unit} · minimum {item.minimumStock}</Text>
                </View>
              ))}
              {!data?.lowStockItems?.length && <Text style={styles.stockGood}>All listed stock is above its warning level.</Text>}
            </View>
          </>
        )}
      </View>
    </PortalLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 18 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { color: '#201060', fontSize: 22, fontWeight: '800' },
  subheading: { color: '#6B6490', fontSize: 13, marginTop: 4 },
  refreshButton: { borderWidth: 1, borderColor: '#201060', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  refreshText: { color: '#201060', fontSize: 13, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  exportButton: { backgroundColor: '#D02010', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  exportText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  monthControl: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 9, borderWidth: 1, borderColor: '#E8E4F8', padding: 6 },
  monthButton: { paddingHorizontal: 9, paddingVertical: 4 }, monthArrow: { color: '#201060', fontSize: 22, fontWeight: '800' },
  monthText: { color: '#201060', fontSize: 14, fontWeight: '700', minWidth: 155, textAlign: 'center' },
  kpiGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metric: { flexGrow: 1, flexBasis: 170, backgroundColor: '#201060', borderRadius: 12, padding: 16 },
  metricLabel: { color: '#C9C4E0', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  metricValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E4F8', padding: 18 },
  twoColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  halfCard: { flexGrow: 1, flexBasis: 290 },
  sectionTitle: { color: '#201060', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EEF8' },
  rank: { color: '#D02010', fontSize: 14, fontWeight: '800', width: 32 }, mealName: { color: '#201060', fontSize: 14, fontWeight: '600', flex: 1 }, mealQty: { color: '#6B6490', fontSize: 13, fontWeight: '700' },
  empty: { color: '#6B6490', fontSize: 14, paddingVertical: 24, textAlign: 'center' },
  compactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F0EEF8', gap: 12 },
  rowName: { color: '#201060', fontSize: 13, fontWeight: '700', textTransform: 'capitalize', flex: 1 },
  rowValue: { color: '#6B6490', fontSize: 12, fontWeight: '700' },
  lowStockCard: { borderColor: '#F0C000', backgroundColor: '#FFFDF3' },
  lowValue: { color: '#D02010', fontSize: 12, fontWeight: '800' },
  stockGood: { color: '#16803A', fontSize: 13, fontWeight: '700', paddingVertical: 12 },
});
