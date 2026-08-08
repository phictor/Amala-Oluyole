import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';

export default function KitchenReportScreen() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, isLoading, refetch, isRefetching } = trpc.kitchen.monthlyReport.useQuery({ month, year, branchId: 1 });

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const monthName = new Date(year, month - 1).toLocaleString('en-NG', { month: 'long', year: 'numeric' });

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>‹ Kitchen</Text></TouchableOpacity>
          <Text style={styles.title}>Monthly Report</Text>
        </View>
        <View style={styles.monthRow}>
          <TouchableOpacity style={styles.monthBtn} onPress={prevMonth}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity>
          <Text style={styles.monthLabel}>{monthName}</Text>
          <TouchableOpacity style={styles.monthBtn} onPress={nextMonth}><Text style={styles.monthArrow}>›</Text></TouchableOpacity>
        </View>
        {isLoading ? <ActivityIndicator color="#201060" style={{ marginTop: 40 }} /> : (
          <>
            <View style={styles.grid}>
              {[
                { label: 'Total Orders', value: data?.summary?.totalOrders ?? 0 },
                { label: 'Revenue', value: `₦${Number(data?.summary?.totalRevenue ?? 0).toLocaleString()}` },
                { label: 'Avg Prep (min)', value: data?.summary?.avgOrderValue ?? '—' },
              ].map(t => (
                <View key={t.label} style={styles.tile}>
                  <Text style={styles.tileLabel}>{t.label}</Text>
                  <Text style={styles.tileValue}>{t.value}</Text>
                </View>
              ))}
            </View>
            {data?.topMeals && data.topMeals.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Top Meals</Text>
                {data.topMeals.map((m: { mealName: string; totalQuantity: number; totalRevenue: number }, i: number) => (
                  <View key={i} style={styles.mealRow}>
                    <Text style={styles.mealRank}>#{i + 1}</Text>
                    <Text style={styles.mealName}>{m.mealName}</Text>
                    <Text style={styles.mealCount}>{m.totalQuantity} orders</Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#201060', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#201060' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 },
  monthBtn: { padding: 8 },
  monthArrow: { fontSize: 24, color: '#201060', fontWeight: '700' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#201060', minWidth: 160, textAlign: 'center' },
  grid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tile: { flex: 1, backgroundColor: '#201060', borderRadius: 14, padding: 14 },
  tileLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 6 },
  tileValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#201060', marginBottom: 10 },
  mealRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  mealRank: { fontSize: 14, fontWeight: '800', color: '#F0C000', width: 28 },
  mealName: { flex: 1, fontSize: 14, color: '#201060', fontWeight: '500' },
  mealCount: { fontSize: 13, color: '#6B6490', fontWeight: '600' },
});
