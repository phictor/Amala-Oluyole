import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { KitchenBranchPicker, useKitchenWorkspace } from '@/components/kitchen/kitchen-workspace';
import { LoadingState } from '@/components/ui';
import { QueryProblem } from '@/components/roles/role-portal-ui';

export default function KitchenReportScreen() {
  const { branchId } = useKitchenWorkspace();
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const reportQ = trpc.kitchen.monthlyReport.useQuery({ branchId, year, month }, { staleTime: 60_000 });
  const report = reportQ.data;

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Monthly Report</Text>
        <TouchableOpacity style={s.fullBtn} onPress={() => router.push({ pathname: '/kitchen/monthly-report' as never, params: { branchId: String(branchId) } })} activeOpacity={0.8}>
          <Text style={s.fullBtnText}>Full Report →</Text>
        </TouchableOpacity>
      </View>
      <KitchenBranchPicker />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        {/* Month Picker */}
        <View style={s.monthRow}>
          {MONTHS.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[s.monthBtn, month === i + 1 && s.monthBtnActive]}
              onPress={() => setMonth(i + 1)}
              activeOpacity={0.8}
            >
              <Text style={[s.monthText, month === i + 1 && s.monthTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Summary */}
        {reportQ.isLoading ? (
          <LoadingState message="Preparing kitchen report..." />
        ) : reportQ.isError ? (
          <QueryProblem accent="#D97706" title="Report unavailable" message="The branch report could not be loaded." onRetry={() => reportQ.refetch()} />
        ) : report ? (
          <>
            <View style={s.summaryGrid}>
              {[
                { label: 'Total Orders', value: String(report.summary?.totalOrders ?? 0) },
                { label: 'Completed', value: String(report.summary?.completedOrders ?? 0) },
                { label: 'Cancelled', value: String(report.summary?.cancelledOrders ?? 0) },
              ].map((item, i) => (
                <View key={i} style={s.summaryCard}>
                  <Text style={s.summaryValue}>{item.value}</Text>
                  <Text style={s.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            {/* Top Meals */}
            {report.topMeals?.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Top Meals This Month</Text>
                {report.topMeals.slice(0, 5).map((meal: any, i: number) => (
                  <View key={i} style={s.mealRow}>
                    <Text style={s.mealRank}>#{i + 1}</Text>
                    <Text style={s.mealName}>{meal.mealName}</Text>
                    <Text style={s.mealCount}>{meal.totalQuantity} ordered</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyText}>No data for {MONTHS[month - 1]} {year}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  fullBtn: { backgroundColor: '#FEF3C7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  fullBtnText: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  monthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 16 },
  monthBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#F3F4F6' },
  monthBtnActive: { backgroundColor: '#D97706' },
  monthText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  monthTextActive: { color: '#FFF' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  summaryCard: { width: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '900', color: '#111827' },
  summaryLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  mealRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  mealRank: { fontSize: 14, fontWeight: '800', color: '#D97706', width: 28 },
  mealName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#111827' },
  mealCount: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
});
