import React from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';

export default function KitchenInventoryScreen() {
  const router = useRouter();
  const { data: inventory, refetch, isRefetching } = trpc.kitchen.allInventory.useQuery({ branchId: 1 });
  const updateStock = trpc.kitchen.updateStock.useMutation({ onSuccess: () => refetch() });

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backText}>‹ Kitchen</Text></TouchableOpacity>
        <Text style={styles.title}>Inventory</Text>
      </View>
      <FlatList
        data={inventory ?? []}
        keyExtractor={(item: { id: number }) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>No inventory items yet.</Text>}
        renderItem={({ item }: { item: { id: number; name: string; currentStock: number; minStock: number; unit: string } }) => {
          const isLow = item.currentStock <= item.minStock;
          return (
            <View style={[styles.card, isLow && styles.cardLow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.currentStock} {item.unit} · min {item.minStock}</Text>
              </View>
              {isLow && <View style={styles.lowBadge}><Text style={styles.lowText}>Low Stock</Text></View>}
              <TouchableOpacity style={styles.restockBtn} onPress={() => updateStock.mutate({ inventoryId: item.id, branchId: 1, quantity: 10, type: 'restock', recordedBy: 1 })}>
                <Text style={styles.restockText}>+ Restock</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8, gap: 12 },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#201060', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: '#201060' },
  empty: { textAlign: 'center', color: '#6B6490', marginTop: 40, fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, gap: 8 },
  cardLow: { borderWidth: 1, borderColor: '#FFCCCC', backgroundColor: '#FFF8F8' },
  itemName: { fontSize: 15, fontWeight: '700', color: '#201060' },
  itemSub: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  lowBadge: { backgroundColor: '#D02010', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  lowText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  restockBtn: { backgroundColor: '#201060', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  restockText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
