import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { PortalLayout } from '@/components/portal-layout';
import { trpc } from '@/lib/trpc';

const OLUYOLE_BRANCH_ID = 1;
const INVENTORY_CATEGORIES = ['swallow', 'soup', 'protein', 'spice', 'vegetable', 'drink', 'packaging', 'other'] as const;

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
  const addItem = trpc.kitchen.addInventoryItem.useMutation({
    onSuccess: () => {
      setAddOpen(false);
      setNewItem({ name: '', category: 'other', unit: 'kg', currentStock: '', minimumStock: '' });
      refetch();
    },
  });
  const lowStock = (inventory ?? []).filter((item: InventoryItem) => Number(item.currentStock) <= Number(item.minimumStock));
  const [addOpen, setAddOpen] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<'restock' | 'usage' | 'waste' | 'adjustment'>('restock');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [newItem, setNewItem] = useState({ name: '', category: 'other' as typeof INVENTORY_CATEGORIES[number], unit: 'kg', currentStock: '', minimumStock: '' });

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

  const saveMovement = () => {
    if (!movementItem) return;
    const quantity = Number(movementQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Enter a quantity', 'Use a number greater than zero.');
      return;
    }
    updateStock.mutate({
      inventoryId: movementItem.id,
      branchId: OLUYOLE_BRANCH_ID,
      type: movementType,
      quantity: movementType === 'usage' || movementType === 'waste' ? -quantity : quantity,
      note: movementNote.trim() || undefined,
    });
    setMovementItem(null);
    setMovementQuantity('');
    setMovementNote('');
  };

  const saveNewItem = () => {
    if (!newItem.name.trim()) {
      Alert.alert('Name required', 'Enter an inventory item name.');
      return;
    }
    const currentStock = Number(newItem.currentStock || 0);
    const minimumStock = Number(newItem.minimumStock || 0);
    if (currentStock < 0 || minimumStock < 0) {
      Alert.alert('Check the quantities', 'Stock quantities cannot be negative.');
      return;
    }
    addItem.mutate({
      branchId: OLUYOLE_BRANCH_ID,
      name: newItem.name.trim(),
      category: newItem.category,
      unit: newItem.unit.trim() || 'kg',
      currentStock,
      minimumStock,
      costPerUnit: 0,
    });
  };

  return (
    <PortalLayout portal="kitchen" title="Oluyole Inventory" badges={{ inventory: lowStock.length }}>
      <View style={styles.page}>
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.heading}>Stock at Oluyole Town Planning</Text>
            <Text style={styles.subheading}>Use the quick actions to record the day’s stock movement.</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.refreshButton} onPress={() => refetch()} disabled={isRefetching}>
              <Text style={styles.refreshText}>{isRefetching ? 'Refreshing…' : 'Refresh'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddOpen(true)}>
              <Text style={styles.addText}>+ Add stock item</Text>
            </TouchableOpacity>
          </View>
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
                  <TouchableOpacity style={styles.recordButton} onPress={() => setMovementItem(item)}>
                    <Text style={styles.recordText}>Record</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {!inventory?.length && <Text style={styles.empty}>No inventory items have been added yet.</Text>}
        </View>
      </View>
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Add stock item</Text>
              <Text style={styles.modalCopy}>This item will be added to Oluyole Town Planning inventory.</Text>
              <Field label="Item name" value={newItem.name} onChangeText={(name) => setNewItem({ ...newItem, name })} placeholder="e.g. Beef" />
              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryChips}>
                {INVENTORY_CATEGORIES.map((category) => (
                  <TouchableOpacity key={category} style={[styles.categoryChip, newItem.category === category && styles.categoryChipActive]} onPress={() => setNewItem({ ...newItem, category })}>
                    <Text style={[styles.categoryChipText, newItem.category === category && styles.categoryChipTextActive]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Field label="Unit" value={newItem.unit} onChangeText={(unit) => setNewItem({ ...newItem, unit })} placeholder="kg, pieces, packs" />
              <View style={styles.fieldPair}>
                <View style={styles.fieldHalf}><Field label="Opening stock" value={newItem.currentStock} onChangeText={(currentStock) => setNewItem({ ...newItem, currentStock })} placeholder="0" keyboardType="decimal-pad" /></View>
                <View style={styles.fieldHalf}><Field label="Low-stock level" value={newItem.minimumStock} onChangeText={(minimumStock) => setNewItem({ ...newItem, minimumStock })} placeholder="0" keyboardType="decimal-pad" /></View>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setAddOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveNewItem} disabled={addItem.isPending}><Text style={styles.saveText}>{addItem.isPending ? 'Saving…' : 'Add item'}</Text></TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={!!movementItem} transparent animationType="fade" onRequestClose={() => setMovementItem(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record stock movement</Text>
            <Text style={styles.modalCopy}>{movementItem?.name} · Current stock: {movementItem?.currentStock} {movementItem?.unit}</Text>
            <View style={styles.movementChoices}>
              {(['restock', 'usage', 'waste', 'adjustment'] as const).map((type) => (
                <TouchableOpacity key={type} style={[styles.categoryChip, movementType === type && styles.categoryChipActive]} onPress={() => setMovementType(type)}>
                  <Text style={[styles.categoryChipText, movementType === type && styles.categoryChipTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Field label="Quantity" value={movementQuantity} onChangeText={setMovementQuantity} placeholder="0" keyboardType="decimal-pad" />
            <Field label="Note (optional)" value={movementNote} onChangeText={setMovementNote} placeholder="e.g. Morning delivery" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setMovementItem(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveMovement} disabled={updateStock.isPending}><Text style={styles.saveText}>{updateStock.isPending ? 'Saving…' : 'Save movement'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </PortalLayout>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad' }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType={keyboardType} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  page: { padding: 24, gap: 18 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  heading: { color: '#201060', fontSize: 22, fontWeight: '800' },
  subheading: { color: '#6B6490', fontSize: 13, marginTop: 4 },
  refreshButton: { borderWidth: 1, borderColor: '#201060', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  refreshText: { color: '#201060', fontSize: 13, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  addButton: { backgroundColor: '#D02010', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
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
  recordButton: { backgroundColor: '#F4F3FB', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8 },
  recordText: { color: '#201060', fontSize: 12, fontWeight: '700' },
  empty: { color: '#6B6490', fontSize: 14, textAlign: 'center', padding: 32 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(18, 10, 62, 0.48)', justifyContent: 'center', padding: 20 },
  modalScroll: { flexGrow: 1, justifyContent: 'center' },
  modalCard: { maxWidth: 560, width: '100%', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20 },
  modalTitle: { color: '#201060', fontSize: 20, fontWeight: '800' },
  modalCopy: { color: '#6B6490', fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  field: { marginBottom: 13 },
  fieldLabel: { color: '#201060', fontSize: 12, fontWeight: '800', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#DAD5ED', color: '#201060', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 10, fontSize: 14 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  movementChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  categoryChip: { borderWidth: 1, borderColor: '#DAD5ED', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  categoryChipActive: { backgroundColor: '#201060', borderColor: '#201060' },
  categoryChipText: { color: '#201060', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  categoryChipTextActive: { color: '#FFFFFF' },
  fieldPair: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: '#DAD5ED' },
  cancelText: { color: '#201060', fontSize: 13, fontWeight: '800' },
  saveButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8, backgroundColor: '#D02010' },
  saveText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
