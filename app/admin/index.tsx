import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, TextInput, Switch, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';

type DashTab = 'overview' | 'orders' | 'meals' | 'riders';

const STATUS_COLOR: Record<string, string> = {
  created: '#8B6F5E', awaiting_payment: '#F59E0B', payment_confirmed: '#3B82F6',
  accepted: '#8B5CF6', preparing: '#F97316', ready: '#10B981',
  rider_assigned: '#06B6D4', out_for_delivery: '#0EA5E9', delivered: '#22C55E',
  completed: '#16A34A', cancelled: '#EF4444', rejected: '#DC2626', refunded: '#6B7280',
};

const STATUS_LABEL: Record<string, string> = {
  created: 'Created', awaiting_payment: 'Awaiting Payment', payment_confirmed: 'Payment Confirmed',
  accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready',
  rider_assigned: 'Rider Assigned', out_for_delivery: 'Out for Delivery', delivered: 'Delivered',
  completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected', refunded: 'Refunded',
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [mealSearch, setMealSearch] = useState('');
  const [editingMeal, setEditingMeal] = useState<null | {
    id: number; name: string; price: string; isAvailable: boolean; description: string;
  }>(null);

  const utils = trpc.useUtils();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: overview, refetch: refetchOverview } = trpc.admin.overview.useQuery(undefined, { retry: 1 });
  const { data: activeOrders, refetch: refetchOrders } = trpc.admin.activeOrders.useQuery(undefined, { retry: 1, refetchInterval: 15_000 });
  const { data: allMeals, refetch: refetchMeals } = trpc.admin.allMeals.useQuery(undefined, { retry: 1 });
  const { data: riders, refetch: refetchRiders } = trpc.admin.riders.useQuery(undefined, { retry: 1 });

  // ── Mutations ────────────────────────────────────────────────────────────
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => { refetchOrders(); utils.admin.activeOrders.invalidate(); },
  });
  const updateMeal = trpc.admin.updateMeal.useMutation({
    onSuccess: () => { refetchMeals(); setEditingMeal(null); },
  });
  const deleteMeal = trpc.admin.deleteMeal.useMutation({
    onSuccess: () => refetchMeals(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchOverview(), refetchOrders(), refetchMeals(), refetchRiders()]);
    setRefreshing(false);
  };

  const handleStatusUpdate = (orderId: number, status: string) => {
    Alert.alert('Update Status', `Set order to "${STATUS_LABEL[status]}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateStatus.mutate({ orderId, status: status as never }) },
    ]);
  };

  const handleSaveMeal = () => {
    if (!editingMeal) return;
    const price = parseFloat(editingMeal.price);
    if (isNaN(price) || price <= 0) { Alert.alert('Error', 'Enter a valid price'); return; }
    updateMeal.mutate({
      id: editingMeal.id,
      name: editingMeal.name,
      price,
      isAvailable: editingMeal.isAvailable,
      description: editingMeal.description,
    });
  };

  const filteredMeals = (allMeals ?? []).filter(m =>
    !mealSearch || m.name.toLowerCase().includes(mealSearch.toLowerCase())
  );

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <LinearGradient colors={['#1A0F0A', '#3D1A0F']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Àmàlà Olúyòlé</Text>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(['overview', 'orders', 'meals', 'riders'] as DashTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === 'overview' ? '📊' : tab === 'orders' ? '📋' : tab === 'meals' ? '🍲' : '🛵'}
              {' '}{tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C0392B" />}
      >
        {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <View style={styles.statsGrid}>
              {[
                { label: "Today's Orders", value: overview?.todayOrders ?? '—', icon: '📦', color: '#C0392B' },
                { label: 'Total Orders', value: overview?.totalOrders ?? '—', icon: '📊', color: '#8B5CF6' },
                { label: 'Active Meals', value: overview?.totalMeals ?? '—', icon: '🍲', color: '#F97316' },
                { label: 'Active Riders', value: overview?.totalRiders ?? '—', icon: '🛵', color: '#10B981' },
                { label: 'Branches', value: overview?.totalBranches ?? '—', icon: '🏪', color: '#3B82F6' },
                { label: 'Pending Orders', value: (activeOrders ?? []).length, icon: '⏳', color: '#F59E0B' },
              ].map((stat, i) => (
                <View key={i} style={[styles.statCard, { borderLeftColor: stat.color }]}>
                  <Text style={styles.statIcon}>{stat.icon}</Text>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Active Orders</Text>
            {(activeOrders ?? []).length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>✅</Text>
                <Text style={styles.emptyText}>No active orders right now</Text>
              </View>
            ) : (
              (activeOrders ?? []).slice(0, 5).map(order => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderCardTop}>
                    <Text style={styles.orderNum}>#{order.orderNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] ?? '#8B6F5E' }]}>
                      <Text style={styles.statusBadgeText}>{STATUS_LABEL[order.status] ?? order.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.orderMeta}>
                    {order.orderType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'} · ₦{parseFloat(String(order.total)).toLocaleString()}
                  </Text>
                  <View style={styles.orderActions}>
                    {['accepted', 'preparing', 'ready'].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.actionBtn, { backgroundColor: STATUS_COLOR[s] }]}
                        onPress={() => handleStatusUpdate(order.id, s)}
                      >
                        <Text style={styles.actionBtnText}>{STATUS_LABEL[s]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── ORDERS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Orders ({(activeOrders ?? []).length})</Text>
            {(activeOrders ?? []).length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={styles.emptyText}>No active orders</Text>
              </View>
            ) : (
              (activeOrders ?? []).map(order => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderCardTop}>
                    <Text style={styles.orderNum}>#{order.orderNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] ?? '#8B6F5E' }]}>
                      <Text style={styles.statusBadgeText}>{STATUS_LABEL[order.status] ?? order.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.orderMeta}>
                    {order.orderType === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'} · ₦{parseFloat(String(order.total)).toLocaleString()}
                  </Text>
                  <Text style={styles.orderMeta}>
                    Payment: {order.paymentMethod} · {order.paymentStatus}
                  </Text>
                  {order.deliveryAddress ? (
                    <Text style={styles.orderAddress} numberOfLines={2}>📍 {order.deliveryAddress}</Text>
                  ) : null}
                  <View style={styles.orderActions}>
                    {['accepted', 'preparing', 'ready', 'rejected'].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.actionBtn, { backgroundColor: STATUS_COLOR[s] ?? '#888' }]}
                        onPress={() => handleStatusUpdate(order.id, s)}
                      >
                        <Text style={styles.actionBtnText}>{STATUS_LABEL[s]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ── MEALS TAB ─────────────────────────────────────────────────── */}
        {activeTab === 'meals' && (
          <View style={styles.section}>
            <View style={styles.mealsHeader}>
              <Text style={styles.sectionTitle}>Meals ({filteredMeals.length})</Text>
              <TouchableOpacity
                style={styles.addMealBtn}
                onPress={() => router.push('/admin/add-meal' as never)}
              >
                <Text style={styles.addMealBtnText}>+ Add Meal</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search meals..."
                placeholderTextColor="#B09080"
                value={mealSearch}
                onChangeText={setMealSearch}
              />
            </View>
            {filteredMeals.map(meal => (
              <View key={meal.id} style={styles.mealCard}>
                <View style={styles.mealCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealPrice}>₦{parseFloat(String(meal.price)).toLocaleString()}</Text>
                  </View>
                  <View style={styles.mealBadges}>
                    <View style={[styles.availBadge, { backgroundColor: meal.isAvailable ? '#10B981' : '#EF4444' }]}>
                      <Text style={styles.availBadgeText}>{meal.isAvailable ? 'Available' : 'Unavailable'}</Text>
                    </View>
                  </View>
                </View>
                {meal.description ? (
                  <Text style={styles.mealDesc} numberOfLines={2}>{meal.description}</Text>
                ) : null}
                <View style={styles.mealActions}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => setEditingMeal({
                      id: meal.id,
                      name: meal.name,
                      price: String(parseFloat(String(meal.price))),
                      isAvailable: meal.isAvailable,
                      description: meal.description ?? '',
                    })}
                  >
                    <Text style={styles.editBtnText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.toggleBtn}
                    onPress={() => updateMeal.mutate({ id: meal.id, isAvailable: !meal.isAvailable })}
                  >
                    <Text style={styles.toggleBtnText}>
                      {meal.isAvailable ? '🔴 Disable' : '🟢 Enable'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => Alert.alert('Delete Meal', `Remove "${meal.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteMeal.mutate({ id: meal.id }) },
                    ])}
                  >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── RIDERS TAB ────────────────────────────────────────────────── */}
        {activeTab === 'riders' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Riders ({(riders ?? []).length})</Text>
            {(riders ?? []).length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🛵</Text>
                <Text style={styles.emptyText}>No riders registered yet</Text>
              </View>
            ) : (
              (riders ?? []).map(riderObj => {
                const r = riderObj.rider;
                return (
                <View key={r.id} style={styles.riderCard}>
                  <View style={styles.riderCardTop}>
                    <View style={[styles.riderStatus, { backgroundColor: r.isOnline ? '#10B981' : '#6B7280' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.riderName}>Rider #{r.id}</Text>
                      <Text style={styles.riderMeta}>
                        {r.vehicleType} · {r.vehiclePlate ?? 'No plate'} · {r.totalDeliveries} deliveries
                      </Text>
                    </View>
                    <View style={styles.riderBadges}>
                      <View style={[styles.availBadge, { backgroundColor: r.isOnline ? '#10B981' : '#6B7280' }]}>
                        <Text style={styles.availBadgeText}>{r.isOnline ? 'Online' : 'Offline'}</Text>
                      </View>
                      {r.isAvailable && r.isOnline && (
                        <View style={[styles.availBadge, { backgroundColor: '#3B82F6', marginTop: 4 }]}>
                          <Text style={styles.availBadgeText}>Available</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {r.currentLatitude && r.currentLongitude ? (
                    <Text style={styles.riderLocation}>
                      📍 {r.currentLatitude.toFixed(4)}, {r.currentLongitude.toFixed(4)}
                      {r.lastLocationUpdate ? ` · Updated ${new Date(r.lastLocationUpdate).toLocaleTimeString()}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.riderLocation}>📍 Location not available</Text>
                  )}
                  <Text style={styles.riderMeta}>⭐ {r.rating?.toFixed(1) ?? '—'} ({r.ratingCount} ratings)</Text>
                </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Edit Meal Modal */}
      {editingMeal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Meal</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={editingMeal.name}
              onChangeText={v => setEditingMeal(prev => prev ? { ...prev, name: v } : null)}
            />
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
              value={editingMeal.description}
              multiline
              onChangeText={v => setEditingMeal(prev => prev ? { ...prev, description: v } : null)}
            />
            <Text style={styles.inputLabel}>Price (₦)</Text>
            <TextInput
              style={styles.input}
              value={editingMeal.price}
              keyboardType="decimal-pad"
              onChangeText={v => setEditingMeal(prev => prev ? { ...prev, price: v } : null)}
            />
            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Available</Text>
              <Switch
                value={editingMeal.isAvailable}
                onValueChange={v => setEditingMeal(prev => prev ? { ...prev, isAvailable: v } : null)}
                trackColor={{ true: '#10B981', false: '#EF4444' }}
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingMeal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMeal}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  backBtn: { marginBottom: 8 },
  backBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EDE0D4' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2.5, borderBottomColor: '#C0392B' },
  tabBtnText: { fontSize: 11, fontWeight: '600', color: '#8B6F5E' },
  tabBtnTextActive: { color: '#C0392B' },

  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A0F0A', marginBottom: 12, marginTop: 8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, shadowColor: '#6B3A2A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#8B6F5E', fontWeight: '600' },

  orderCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#6B3A2A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNum: { fontSize: 16, fontWeight: '800', color: '#1A0F0A' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  orderMeta: { fontSize: 13, color: '#8B6F5E', marginBottom: 2 },
  orderAddress: { fontSize: 12, color: '#8B6F5E', marginTop: 4, marginBottom: 4 },
  orderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addMealBtn: { backgroundColor: '#C0392B', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addMealBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  searchBox: {
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#EDE0D4', marginBottom: 12,
  },
  searchInput: { fontSize: 14, color: '#1A0F0A' },
  mealCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#6B3A2A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  mealCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  mealName: { fontSize: 15, fontWeight: '800', color: '#1A0F0A' },
  mealPrice: { fontSize: 14, fontWeight: '700', color: '#C0392B', marginTop: 2 },
  mealDesc: { fontSize: 12, color: '#8B6F5E', lineHeight: 17, marginBottom: 8 },
  mealBadges: { alignItems: 'flex-end' },
  availBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  availBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  mealActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  toggleBtn: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#1A0F0A' },
  deleteBtn: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { fontSize: 14 },

  riderCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#6B3A2A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  riderCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  riderStatus: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  riderName: { fontSize: 15, fontWeight: '800', color: '#1A0F0A' },
  riderMeta: { fontSize: 12, color: '#8B6F5E', marginTop: 2 },
  riderBadges: { alignItems: 'flex-end' },
  riderLocation: { fontSize: 12, color: '#8B6F5E', marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: '#8B6F5E' },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  modal: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A0F0A', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#8B6F5E', marginBottom: 4 },
  input: {
    backgroundColor: '#F9F5F2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#1A0F0A', borderWidth: 1.5, borderColor: '#EDE0D4', marginBottom: 12,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#8B6F5E' },
  saveBtn: { flex: 1, backgroundColor: '#C0392B', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
