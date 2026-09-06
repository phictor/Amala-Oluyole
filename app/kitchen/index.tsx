import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  FlatList, Alert, Modal, StyleSheet, RefreshControl, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { useRequireRole } from "@/hooks/use-require-role";
import { LoadingState } from "@/components/ui";

type KitchenTab = 'orders' | 'meals' | 'stock' | 'report';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function KitchenPortal() {
  const { allowed, loading: roleLoading } = useRequireRole(["kitchen", "admin"]);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<KitchenTab>('orders');
  const [branchId] = useState(1); // TODO: derive from user.preferredBranchId
  const [refreshing, setRefreshing] = useState(false);

  // ── Role gate via live DB profile ─────────────────────────────────────────
  const { data: myProfile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, { staleTime: 60_000 });
  const ALLOWED_ROLES = ['admin', 'manager', 'kitchen'];
  const liveRole = (myProfile as { role?: string } | undefined)?.role ?? '';
  const myProfileId = (myProfile as { id?: number } | undefined)?.id ?? 0;

  // Report state
  const now = new Date();
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);

  // Stock form state
  const [showAddStock, setShowAddStock] = useState(false);
  const [showUpdateStock, setShowUpdateStock] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [stockForm, setStockForm] = useState({ name: '', category: 'other' as any, unit: 'kg', currentStock: '', minimumStock: '', costPerUnit: '', supplier: '', notes: '' });
  const [updateForm, setUpdateForm] = useState({ type: 'restock' as any, quantity: '', note: '' });

  // Queries
  // ── Queries with 30-second auto-polling for orders ────────────────────────
  const ordersQ = trpc.admin.activeOrders.useQuery({ branchId }, { refetchInterval: 30_000 });
  const mealsQ = trpc.menu.meals.useQuery({ branchId });
  const stockQ = trpc.kitchen.allInventory.useQuery({ branchId });
  const reportQ = trpc.kitchen.monthlyReport.useQuery({ branchId, year: reportYear, month: reportMonth });

  // Mutations
  const utils = trpc.useUtils();
  const updateOrderStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => utils.admin.activeOrders.invalidate() });
  const toggleMeal = trpc.kitchen.toggleMealAvailability.useMutation({ onSuccess: () => utils.menu.meals.invalidate() });
  const addStock = trpc.kitchen.addInventoryItem.useMutation({ onSuccess: () => { utils.kitchen.allInventory.invalidate(); setShowAddStock(false); } });
  const updateStock = trpc.kitchen.updateStock.useMutation({ onSuccess: () => { utils.kitchen.allInventory.invalidate(); setShowUpdateStock(false); } });
  const deleteStock = trpc.kitchen.deleteInventoryItem.useMutation({ onSuccess: () => utils.kitchen.allInventory.invalidate() });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([ordersQ.refetch(), mealsQ.refetch(), stockQ.refetch()]);
    setRefreshing(false);
  };

  if (roleLoading) return <LoadingState fullScreen message="Checking access..." />;
  if (!allowed) return null;

  if (profileLoading) {
    return (
      <ScreenContainer className="items-center justify-center p-8">
        <Text style={{ fontSize: 24 }}>⏳</Text>
        <Text style={[s.muted, { textAlign: 'center', marginTop: 8 }]}>Verifying access...</Text>
      </ScreenContainer>
    );
  }
  if (!myProfile || !ALLOWED_ROLES.includes(liveRole)) {
    return (
      <ScreenContainer className="items-center justify-center p-8">
        <Text style={{ fontSize: 48 }}>🔒</Text>
        <Text style={[s.heading, { textAlign: 'center', marginTop: 16 }]}>Access Denied</Text>
        <Text style={[s.muted, { textAlign: 'center', marginTop: 8 }]}>Kitchen Portal is only accessible to kitchen staff, managers, and admins.</Text>
        <TouchableOpacity style={s.btn} onPress={() => router.back()}>
          <Text style={s.btnTxt}>Go Back</Text>
        </TouchableOpacity>
      </ScreenContainer>
    );
  }

  const tabs: { key: KitchenTab; label: string; icon: string }[] = [
    { key: 'orders', label: 'Orders', icon: '📋' },
    { key: 'meals', label: 'Meals', icon: '🍽️' },
    { key: 'stock', label: 'Stock', icon: '📦' },
    { key: 'report', label: 'Report', icon: '📊' },
  ];

  const statusColour = (status: string) => {
    if (['payment_confirmed', 'accepted'].includes(status)) return '#F0C000';
    if (status === 'preparing') return '#D02010';
    if (status === 'ready') return '#27AE60';
    return '#6B6490';
  };

  const nextStatus: Record<string, string> = {
    payment_confirmed: 'accepted',
    accepted: 'preparing',
    preparing: 'ready',
    ready: 'rider_assigned',
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: '#FFFFFF', fontSize: 18 }}>‹</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Kitchen Portal</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab Bar */}
      <View style={s.tabBar}>
        {tabs.map(t => (
          <TouchableOpacity key={t.key} style={[s.tabItem, activeTab === t.key && s.tabActive]} onPress={() => setActiveTab(t.key)}>
            <Text style={{ fontSize: 16 }}>{t.icon}</Text>
            <Text style={[s.tabLabel, activeTab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Active Orders ({ordersQ.data?.length ?? 0})</Text>
            {ordersQ.data?.length === 0 && <Text style={s.muted}>No active orders right now.</Text>}
            {ordersQ.data?.map((order: any) => (
              <View key={order.id} style={s.card}>
                <View style={s.row}>
                  <Text style={s.orderNum}>#{order.orderNumber}</Text>
                  <View style={[s.badge, { backgroundColor: statusColour(order.status) }]}>
                    <Text style={s.badgeTxt}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={s.muted}>{order.orderType === 'delivery' ? '🚚 Delivery' : '🏃 Pickup'} · {order.itemCount ?? '?'} item(s)</Text>
                <Text style={s.muted}>Customer: {order.customerName ?? 'Guest'}</Text>
                {order.customerNotes ? <Text style={[s.muted, { color: '#D02010' }]}>Note: {order.customerNotes}</Text> : null}
                {nextStatus[order.status] && (
                  <TouchableOpacity
                    style={[s.btn, { marginTop: 8 }]}
                    onPress={() => updateOrderStatus.mutate({ orderId: order.id, status: nextStatus[order.status] as any })}
                  >
                    <Text style={s.btnTxt}>Mark as {nextStatus[order.status].replace(/_/g, ' ')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── MEALS TAB ── */}
      {activeTab === 'meals' && (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Meal Availability</Text>
            <Text style={s.muted}>Toggle meals on/off when you run out of ingredients.</Text>
            {mealsQ.data?.map((meal: any) => (
              <View key={meal.id} style={[s.card, s.row]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{meal.name}</Text>
                  <Text style={s.muted}>₦{parseFloat(meal.price).toLocaleString()}</Text>
                </View>
                <Switch
                  value={meal.isAvailable}
                  onValueChange={(val) => toggleMeal.mutate({ mealId: meal.id, branchId, isAvailable: val })}
                  trackColor={{ false: '#E8E6F4', true: '#201060' }}
                  thumbColor={meal.isAvailable ? '#F0C000' : '#9B94C4'}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* ── STOCK TAB ── */}
      {activeTab === 'stock' && (
        <>
          <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <View style={s.section}>
              <View style={s.row}>
                <Text style={s.sectionTitle}>Inventory ({stockQ.data?.length ?? 0} items)</Text>
                <TouchableOpacity style={s.addBtn} onPress={() => setShowAddStock(true)}>
                  <Text style={s.addBtnTxt}>+ Add Item</Text>
                </TouchableOpacity>
              </View>
              {stockQ.data?.map((item: any) => {
                const isLow = parseFloat(item.currentStock) <= parseFloat(item.minimumStock);
                return (
                  <View key={item.id} style={[s.card, isLow && { borderLeftWidth: 4, borderLeftColor: '#D02010' }]}>
                    <View style={s.row}>
                      <Text style={s.cardTitle}>{item.name}</Text>
                      {isLow && <Text style={{ color: '#D02010', fontWeight: '700', fontSize: 11 }}>⚠️ LOW</Text>}
                    </View>
                    <Text style={s.muted}>{item.category} · {item.unit}</Text>
                    <View style={s.row}>
                      <Text style={{ color: '#201060', fontWeight: '600' }}>Stock: {item.currentStock} {item.unit}</Text>
                      <Text style={s.muted}>Min: {item.minimumStock} {item.unit}</Text>
                    </View>
                    {item.supplier ? <Text style={s.muted}>Supplier: {item.supplier}</Text> : null}
                    <View style={[s.row, { marginTop: 8, gap: 8 }]}>
                      <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#27AE60' }]} onPress={() => { setSelectedItem(item); setUpdateForm({ type: 'restock', quantity: '', note: '' }); setShowUpdateStock(true); }}>
                        <Text style={s.btnTxt}>+ Restock</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#6B6490' }]} onPress={() => { setSelectedItem(item); setUpdateForm({ type: 'usage', quantity: '', note: '' }); setShowUpdateStock(true); }}>
                        <Text style={s.btnTxt}>- Use</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: '#D02010' }]} onPress={() => Alert.alert('Delete', `Remove ${item.name} from inventory?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteStock.mutate({ id: item.id }) }])}>
                        <Text style={s.btnTxt}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Add Stock Modal */}
          <Modal visible={showAddStock} animationType="slide" presentationStyle="pageSheet">
            <View style={s.modal}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>Add Inventory Item</Text>
                <TouchableOpacity onPress={() => setShowAddStock(false)}><Text style={{ color: '#D02010', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
                {[
                  { label: 'Item Name *', key: 'name', placeholder: 'e.g. Yam Flour' },
                  { label: 'Unit', key: 'unit', placeholder: 'kg, litres, bags, pieces' },
                  { label: 'Current Stock', key: 'currentStock', placeholder: '0', keyboard: 'numeric' },
                  { label: 'Minimum Stock (alert level)', key: 'minimumStock', placeholder: '0', keyboard: 'numeric' },
                  { label: 'Cost per Unit (₦)', key: 'costPerUnit', placeholder: '0', keyboard: 'numeric' },
                  { label: 'Supplier', key: 'supplier', placeholder: 'Optional' },
                  { label: 'Notes', key: 'notes', placeholder: 'Optional' },
                ].map(f => (
                  <View key={f.key}>
                    <Text style={s.label}>{f.label}</Text>
                    <TextInput
                      style={s.input}
                      placeholder={f.placeholder}
                      value={(stockForm as any)[f.key]}
                      onChangeText={v => setStockForm(p => ({ ...p, [f.key]: v }))}
                      keyboardType={(f as any).keyboard ?? 'default'}
                    />
                  </View>
                ))}
                <Text style={s.label}>Category</Text>
                <View style={s.row}>
                  {['swallow','soup','protein','spice','vegetable','drink','packaging','other'].map(cat => (
                    <TouchableOpacity key={cat} style={[s.chip, stockForm.category === cat && s.chipActive]} onPress={() => setStockForm(p => ({ ...p, category: cat }))}>
                      <Text style={[s.chipTxt, stockForm.category === cat && s.chipTxtActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[s.btn, { marginTop: 16 }]} onPress={() => {
                  if (!stockForm.name) return Alert.alert('Error', 'Item name is required');
                  addStock.mutate({ branchId, name: stockForm.name, category: stockForm.category, unit: stockForm.unit || 'kg', currentStock: parseFloat(stockForm.currentStock) || 0, minimumStock: parseFloat(stockForm.minimumStock) || 0, costPerUnit: parseFloat(stockForm.costPerUnit) || 0, supplier: stockForm.supplier || undefined, notes: stockForm.notes || undefined });
                }}>
                  <Text style={s.btnTxt}>{addStock.isPending ? 'Saving...' : 'Save Item'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </Modal>

          {/* Update Stock Modal */}
          <Modal visible={showUpdateStock} animationType="slide" presentationStyle="pageSheet">
            <View style={s.modal}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{updateForm.type === 'restock' ? '+ Restock' : '- Record Usage'}: {selectedItem?.name}</Text>
                <TouchableOpacity onPress={() => setShowUpdateStock(false)}><Text style={{ color: '#D02010', fontSize: 16 }}>Cancel</Text></TouchableOpacity>
              </View>
              <View style={{ padding: 16, gap: 12 }}>
                <Text style={s.label}>Transaction Type</Text>
                <View style={s.row}>
                  {['restock','usage','waste','adjustment'].map(t => (
                    <TouchableOpacity key={t} style={[s.chip, updateForm.type === t && s.chipActive]} onPress={() => setUpdateForm(p => ({ ...p, type: t as any }))}>
                      <Text style={[s.chipTxt, updateForm.type === t && s.chipTxtActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.label}>Quantity ({selectedItem?.unit})</Text>
                <TextInput style={s.input} placeholder="0" value={updateForm.quantity} onChangeText={v => setUpdateForm(p => ({ ...p, quantity: v }))} keyboardType="numeric" />
                <Text style={s.label}>Note (optional)</Text>
                <TextInput style={s.input} placeholder="e.g. Received from supplier" value={updateForm.note} onChangeText={v => setUpdateForm(p => ({ ...p, note: v }))} />
                <TouchableOpacity style={[s.btn, { marginTop: 8 }]} onPress={() => {
                  if (!updateForm.quantity) return Alert.alert('Error', 'Quantity is required');
                  const qty = parseFloat(updateForm.quantity);
                  const finalQty = updateForm.type === 'restock' ? Math.abs(qty) : -Math.abs(qty);
                  updateStock.mutate({ inventoryId: selectedItem.id, branchId, type: updateForm.type, quantity: finalQty, note: updateForm.note || undefined, recordedBy: myProfileId });
                }}>
                  <Text style={s.btnTxt}>{updateStock.isPending ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* ── MONTHLY REPORT TAB ── */}
      {activeTab === 'report' && (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { reportQ.refetch(); }} />}>
          <View style={s.section}>
            {/* Month/Year Picker */}
            <View style={[s.card, s.row, { gap: 8 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Month</Text>
                <View style={s.row}>
                  <TouchableOpacity onPress={() => setReportMonth(m => m === 1 ? 12 : m - 1)} style={s.arrowBtn}><Text style={s.arrowTxt}>‹</Text></TouchableOpacity>
                  <Text style={[s.cardTitle, { flex: 1, textAlign: 'center' }]}>{MONTH_NAMES[reportMonth - 1]}</Text>
                  <TouchableOpacity onPress={() => setReportMonth(m => m === 12 ? 1 : m + 1)} style={s.arrowBtn}><Text style={s.arrowTxt}>›</Text></TouchableOpacity>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Year</Text>
                <View style={s.row}>
                  <TouchableOpacity onPress={() => setReportYear(y => y - 1)} style={s.arrowBtn}><Text style={s.arrowTxt}>‹</Text></TouchableOpacity>
                  <Text style={[s.cardTitle, { flex: 1, textAlign: 'center' }]}>{reportYear}</Text>
                  <TouchableOpacity onPress={() => setReportYear(y => y + 1)} style={s.arrowBtn}><Text style={s.arrowTxt}>›</Text></TouchableOpacity>
                </View>
              </View>
            </View>

            {reportQ.isLoading && <Text style={s.muted}>Loading report...</Text>}
            {reportQ.data && (
              <>
                {/* Summary KPIs */}
                <Text style={s.sectionTitle}>Summary — {MONTH_NAMES[reportMonth - 1]} {reportYear}</Text>
                <View style={s.kpiGrid}>
                  {[
                    { label: 'Total Orders', value: String(reportQ.data.summary.totalOrders ?? 0) },
                    { label: 'Completed', value: String(reportQ.data.summary.completedOrders ?? 0) },
                    { label: 'Cancelled', value: String(reportQ.data.summary.cancelledOrders ?? 0) },
                    { label: 'Revenue', value: `₦${parseFloat(String(reportQ.data.summary.totalRevenue ?? 0)).toLocaleString()}` },
                    { label: 'Avg Order', value: `₦${parseFloat(String(reportQ.data.summary.avgOrderValue ?? 0)).toFixed(0)}` },
                  ].map(k => (
                    <View key={k.label} style={s.kpiCard}>
                      <Text style={s.kpiValue}>{k.value}</Text>
                      <Text style={s.kpiLabel}>{k.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Order Type Breakdown */}
                <Text style={s.sectionTitle}>Order Types</Text>
                <View style={[s.card, s.row, { gap: 16 }]}>
                  {reportQ.data.orderTypeBreakdown.map((t: any) => (
                    <View key={t.orderType} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 28 }}>{t.orderType === 'delivery' ? '🚚' : '🏃'}</Text>
                      <Text style={s.cardTitle}>{t.count}</Text>
                      <Text style={s.muted}>{t.orderType}</Text>
                    </View>
                  ))}
                </View>

                {/* Top Meals */}
                <Text style={s.sectionTitle}>Top 10 Meals</Text>
                {reportQ.data.topMeals.map((m: any, i: number) => (
                  <View key={m.mealName} style={[s.card, s.row]}>
                    <Text style={[s.cardTitle, { color: '#201060', width: 28 }]}>#{i + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>{m.mealName}</Text>
                      <Text style={s.muted}>{m.totalQuantity} orders · ₦{parseFloat(m.totalRevenue).toLocaleString()}</Text>
                    </View>
                  </View>
                ))}

                {/* Low Stock Alert */}
                {reportQ.data.lowStockItems.length > 0 && (
                  <>
                    <Text style={[s.sectionTitle, { color: '#D02010' }]}>⚠️ Low Stock Items</Text>
                    {reportQ.data.lowStockItems.map((item: any) => (
                      <View key={item.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: '#D02010' }]}>
                        <Text style={s.cardTitle}>{item.name}</Text>
                        <Text style={s.muted}>Current: {item.currentStock} {item.unit} · Min: {item.minimumStock} {item.unit}</Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Daily Orders */}
                <Text style={s.sectionTitle}>Daily Breakdown</Text>
                {reportQ.data.dailyOrders.map((d: any) => (
                  <View key={d.day} style={[s.card, s.row]}>
                    <Text style={[s.muted, { width: 90 }]}>{d.day}</Text>
                    <Text style={{ flex: 1, color: '#201060', fontWeight: '600' }}>{d.count} orders</Text>
                    <Text style={{ color: '#27AE60', fontWeight: '600' }}>₦{parseFloat(d.revenue).toLocaleString()}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: '#201060', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E6F4' },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#201060' },
  tabLabel: { fontSize: 11, color: '#9B94C4' },
  tabLabelActive: { color: '#201060', fontWeight: '700' },
  section: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#201060', marginBottom: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#201060', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#201060' },
  muted: { fontSize: 13, color: '#9B94C4', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  btn: { backgroundColor: '#201060', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  btnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  addBtn: { backgroundColor: '#F4F3FB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnTxt: { color: '#201060', fontWeight: '700', fontSize: 13 },
  orderNum: { fontSize: 16, fontWeight: '700', color: '#201060' },
  heading: { fontSize: 22, fontWeight: '700', color: '#201060' },
  label: { fontSize: 13, fontWeight: '600', color: '#201060', marginBottom: 4 },
  input: { backgroundColor: '#F4F3FB', borderRadius: 10, padding: 12, fontSize: 14, color: '#201060', borderWidth: 1, borderColor: '#E8E6F4' },
  chip: { backgroundColor: '#F4F3FB', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, margin: 2 },
  chipActive: { backgroundColor: '#201060' },
  chipTxt: { fontSize: 12, color: '#6B6490' },
  chipTxtActive: { color: '#FFFFFF', fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8E6F4', backgroundColor: '#F4F3FB' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#201060' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  kpiCard: { backgroundColor: '#201060', borderRadius: 12, padding: 14, minWidth: '30%', flex: 1, alignItems: 'center' },
  kpiValue: { color: '#F0C000', fontSize: 20, fontWeight: '800' },
  kpiLabel: { color: '#9B94C4', fontSize: 11, marginTop: 2, textAlign: 'center' },
  arrowBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F3FB', borderRadius: 8 },
  arrowTxt: { fontSize: 18, color: '#201060', fontWeight: '700' },
});
