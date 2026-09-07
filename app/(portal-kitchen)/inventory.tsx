import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { PortalLayout } from '@/components/portal-layout';
import { trpc } from '@/lib/trpc';

const OLUYOLE_BRANCH_ID = 1;

type InventoryItem = {
  id: number;
  name: string;
  category: string;
  currentStock: string | number;
  minimumStock: string | number;
  unit: string;
};

export default function KitchenInventoryScreen() {
  const { data: inventory, refetch, isRefetching } = trpc.kitchen.allInventory.useQuery({ branchId: OLUYOLE_BRANCH_ID });
  const updateStock = trpc.kitchen.updateStock.useMutation({ onSuccess: () => refetch() });
  const lowStock = (inventory ?? []).filter((item: InventoryItem) => Number(item.currentStock) <= Number(item.minimumStock));

  const recordQuickUpdate = (item: InventoryItem, type: 'restock' | 'usage', quantity: number) => {
    const description = type === 'restock' ? `Add ${quantity} ${item.unit} to ${item.name}?` : `Record ${quantity} ${item.unit} of ${item.name} as used?`;
    Alert.alert(type === 'restock' ? 'Restock item' : 'Record usage', description, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => updateStock.mutate({
          inventoryId: item.id,
          branchId: OLUYOLE_BRANCH_ID,
          quantity: type === 'usage' ? -quantity : quantity,
          type,
        }),
      },
    ]);
  };

  return (
    <PortalLayout portal="kitchen" title="Oluyole Inventory" badges={{ inventory: lowStock.length }}>
      <View style={styles.page}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.heading}>Stock at Oluyole Town Planning</Text>
            <Text style={styles.subheading}>Use the quick actions to record the day’s stock movement.</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={() => refetch()} disabled={isRefetching}>
            <Text style={styles.refreshText}>{isRefetching ? 'Refreshing…' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>

        {lowStock.length > 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Low stock: {lowStock.length} item{lowStock.length === 1 ? '' : 's'}</Text>
            <Text style={styles.alertCopy}>Restock these items before the next service period.</Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={[styles.row, styles.tableHead]}>
            <Text style={[styles.headText, styles.nameCol]}>Item</Text>
            <Text style={[styles.headText, styles.stockCol]}>Current</Text>
            <Text style={[styles.headText, styles.stockCol]}>Minimum</Text>
            <Text style={[styles.headText, styles.actionCol]}>Quick action</Text>
          </View>
          {(inventory ?? []).map((item: InventoryItem) => {
            const low = Number(item.currentStock) <= Number(item.minimumStock);
            return (
              <View key={item.id} style={[styles.row, low && styles.rowLow]}>
                <View style={styles.nameCol}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.category}</Text>
                </View>
                <Text style={[styles.stockText, styles.stockCol, low && styles.stockLow]}>{item.currentStock} {item.unit}</Text>
                <Text style={[styles.stockText, styles.stockCol]}>{item.minimumStock} {item.unit}</Text>
                <View style={[styles.actions, styles.actionCol]}>
                  <TouchableOpacity style={styles.useButton} onPress={() => recordQuickUpdate(item, 'usage', 1)}>
                    <Text style={styles.useText}>− Use 1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.restockButton} onPress={() => recordQuickUpdate(item, 'restock', 10)}>
                    <Text style={styles.restockText}>+ Restock 10</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {!inventory?.length && <Text style={styles.empty}>No inventory items have been added yet.</Text>}
        </View>
      </View>
    </PortalLayout>
  );
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 18 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  heading: { color: '#201060', fontSize: 22, fontWeight: '800' },
  subheading: { color: '#6B6490', fontSize: 13, marginTop: 4 },
  refreshButton: { borderWidth: 1, borderColor: '#201060', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  refreshText: { color: '#201060', fontSize: 13, fontWeight: '700' },
  alertBox: { borderWidth: 1, borderColor: '#F0C000', backgroundColor: '#FFF8DB', borderRadius: 10, padding: 14 },
  alertTitle: { color: '#201060', fontWeight: '800', fontSize: 14 },
  alertCopy: { color: '#6B6490', fontSize: 13, marginTop: 3 },
  table: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E4F8', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EEF8', gap: 12 },
  tableHead: { backgroundColor: '#F4F3FB', paddingVertical: 11 },
  rowLow: { backgroundColor: '#FFF8F8' },
  headText: { color: '#6B6490', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  nameCol: { flex: 1.7 }, stockCol: { flex: 0.85 }, actionCol: { flex: 1.6 },
  itemName: { color: '#201060', fontSize: 14, fontWeight: '700' },
  itemMeta: { color: '#9B94C4', fontSize: 11, textTransform: 'capitalize', marginTop: 2 },
  stockText: { color: '#201060', fontSize: 13, fontWeight: '600' }, stockLow: { color: '#D02010' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  useButton: { borderWidth: 1, borderColor: '#C9C4E0', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8 },
  useText: { color: '#201060', fontSize: 12, fontWeight: '700' },
  restockButton: { backgroundColor: '#201060', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8 },
  restockText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  empty: { color: '#6B6490', fontSize: 14, textAlign: 'center', padding: 32 },
});
