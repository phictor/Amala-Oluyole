import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { KitchenBranchPicker, useKitchenWorkspace } from '@/components/kitchen/kitchen-workspace';
import { LoadingState } from '@/components/ui';
import { QueryProblem } from '@/components/roles/role-portal-ui';

export default function KitchenInventoryScreen() {
  const { branchId } = useKitchenWorkspace();
  const [refreshing, setRefreshing] = useState(false);
  const stockQ = trpc.kitchen.allInventory.useQuery({ branchId }, { staleTime: 30_000 });
  const utils = trpc.useUtils();
  const depleteStock = trpc.kitchen.updateStock.useMutation({ onSuccess: () => utils.kitchen.allInventory.invalidate() });

  const items = stockQ.data ?? [];
  const lowStock = items.filter((i: any) => Number(i.currentStock) <= Number(i.minimumStock));

  const onRefresh = async () => { setRefreshing(true); await stockQ.refetch(); setRefreshing(false); };

  const handleDeplete = (itemId: number, name: string) => {
    Alert.alert('Use Stock', `Record usage for "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Use 1 unit', onPress: () => depleteStock.mutate({ inventoryId: itemId, branchId, type: 'usage', quantity: -1, note: 'Kitchen usage' }) },
    ]);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Inventory</Text>
        <Text style={s.sub}>{items.length} items · {lowStock.length} low stock</Text>
      </View>
      <KitchenBranchPicker />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {stockQ.isLoading && <LoadingState message="Loading branch inventory..." />}
        {stockQ.isError && <QueryProblem accent="#D97706" title="Inventory unavailable" message="Stock could not be loaded. Retry before recording usage." onRetry={() => stockQ.refetch()} />}
        {lowStock.length > 0 && (
          <View style={s.alertBanner}>
            <Text style={s.alertText}>⚠️ {lowStock.length} item{lowStock.length > 1 ? 's' : ''} below minimum stock level</Text>
          </View>
        )}
        {items.map((item: any) => {
          const isLow = Number(item.currentStock) <= Number(item.minimumStock);
          return (
            <View key={item.id} style={[s.card, isLow && s.cardLow]}>
              <View style={s.cardLeft}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemCategory}>{item.category} · {item.unit}</Text>
                {isLow && <Text style={s.lowText}>⚠️ Low stock</Text>}
              </View>
              <View style={s.cardRight}>
                <Text style={[s.stockNum, { color: isLow ? '#EF4444' : '#22C55E' }]}>{item.currentStock}</Text>
                <Text style={s.stockMin}>min: {item.minimumStock}</Text>
                <TouchableOpacity style={s.useBtn} onPress={() => handleDeplete(item.id, item.name)} activeOpacity={0.8}>
                  <Text style={s.useBtnText}>Use</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        {!stockQ.isLoading && !stockQ.isError && items.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📦</Text>
            <Text style={s.emptyText}>No inventory items yet</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  alertBanner: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginTop: 16, marginBottom: 4, borderWidth: 1, borderColor: '#FDE68A' },
  alertText: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  cardLow: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
  cardLeft: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itemCategory: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  lowText: { fontSize: 12, color: '#EF4444', fontWeight: '700', marginTop: 4 },
  cardRight: { alignItems: 'center', gap: 4 },
  stockNum: { fontSize: 22, fontWeight: '900' },
  stockMin: { fontSize: 11, color: '#9CA3AF' },
  useBtn: { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  useBtnText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
});
