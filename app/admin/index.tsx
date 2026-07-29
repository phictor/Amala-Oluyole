import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, TextInput, Switch, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';

type DashTab = 'overview' | 'orders' | 'meals' | 'riders' | 'reports' | 'promos';

type PromoForm = {
  code: string; description: string; type: 'percentage' | 'fixed' | 'free_delivery' | 'bogo';
  value: string; minOrderAmount: string; maxDiscount: string; usageLimit: string;
  perUserLimit: string; isActive: boolean; startsAt: string; expiresAt: string;
};
const EMPTY_PROMO: PromoForm = {
  code: '', description: '', type: 'percentage', value: '', minOrderAmount: '0',
  maxDiscount: '', usageLimit: '', perUserLimit: '1', isActive: true, startsAt: '', expiresAt: '',
};

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
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [promoForm, setPromoForm] = useState<PromoForm>(EMPTY_PROMO);
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [showPromoForm, setShowPromoForm] = useState(false);

  const utils = trpc.useUtils();

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: overview, refetch: refetchOverview } = trpc.admin.overview.useQuery(undefined, { retry: 1 });
  const { data: activeOrders, refetch: refetchOrders } = trpc.admin.activeOrders.useQuery(undefined, { retry: 1, refetchInterval: 15_000 });
  const { data: allMeals, refetch: refetchMeals } = trpc.admin.allMeals.useQuery(undefined, { retry: 1 });
  const { data: riders, refetch: refetchRiders } = trpc.admin.riders.useQuery(undefined, { retry: 1 });

  // ── Mutations ────────────────────────────────────────────────────────────
  const { data: txReport, refetch: refetchReport } = trpc.admin.transactionReport.useQuery(
    { fromDate: reportFrom || undefined, toDate: reportTo || undefined, limit: 100 },
    { retry: 1, enabled: activeTab === 'reports' }
  );
  const { data: allPromoCodes, refetch: refetchPromos } = trpc.admin.allPromoCodes.useQuery(
    undefined, { retry: 1, enabled: activeTab === 'promos' }
  );
  const createPromo = trpc.admin.createPromoCode.useMutation({ onSuccess: () => { refetchPromos(); setShowPromoForm(false); setPromoForm(EMPTY_PROMO); } });
  const updatePromo = trpc.admin.updatePromoCode.useMutation({ onSuccess: () => { refetchPromos(); setShowPromoForm(false); setEditingPromoId(null); setPromoForm(EMPTY_PROMO); } });
  const togglePromo = trpc.admin.togglePromoCode.useMutation({ onSuccess: () => refetchPromos() });
  const deletePromo = trpc.admin.deletePromoCode.useMutation({ onSuccess: () => refetchPromos() });

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
    if (activeTab === 'reports') await refetchReport();
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
      {(['overview', 'orders', 'meals', 'riders', 'reports', 'promos'] as DashTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === 'overview' ? '📊' : tab === 'orders' ? '📋' : tab === 'meals' ? '🍲' : tab === 'riders' ? '🛵' : tab === 'reports' ? '💳' : '🎟️'}
              {' '}{tab === 'promos' ? 'Promos' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                    onPress={() => router.push({ pathname: '/admin/add-meal' as never, params: { id: String(meal.id) } })}
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
      {/* ── REPORTS TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#C0392B" />}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Report</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>From (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={reportFrom} onChangeText={setReportFrom}
                  placeholder="2025-01-01" placeholderTextColor="#B09080" returnKeyType="done" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>To (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={reportTo} onChangeText={setReportTo}
                  placeholder="2025-12-31" placeholderTextColor="#B09080" returnKeyType="done" />
              </View>
            </View>
            <TouchableOpacity style={styles.addMealBtn} onPress={() => refetchReport()}>
              <Text style={styles.addMealBtnText}>🔍 Apply Filter</Text>
            </TouchableOpacity>
            {txReport?.summary && (
              <View style={[styles.statsGrid, { marginTop: 16 }]}>
                {([
                  ['Total Orders', txReport.summary.totalOrders, '📦', '#C0392B'],
                  ['Total Revenue', `₦${Number(txReport.summary.totalRevenue).toLocaleString()}`, '💰', '#10B981'],
                  ['Paid', txReport.summary.paidOrders, '✅', '#3B82F6'],
                  ['Pending', txReport.summary.pendingOrders, '⏳', '#F59E0B'],
                  ['Failed', txReport.summary.failedOrders, '❌', '#EF4444'],
                  ['Card Rev.', `₦${Number(txReport.summary.cardRevenue).toLocaleString()}`, '💳', '#8B5CF6'],
                  ['Transfer Rev.', `₦${Number(txReport.summary.transferRevenue).toLocaleString()}`, '🏦', '#06B6D4'],
                  ['Cash Rev.', `₦${Number(txReport.summary.cashRevenue).toLocaleString()}`, '💵', '#F97316'],
                ] as [string, string | number, string, string][]).map(([label, value, icon, color], i) => (
                  <View key={i} style={[styles.statCard, { borderLeftColor: color }]}>
                    <Text style={styles.statIcon}>{icon}</Text>
                    <Text style={[styles.statValue, { color, fontSize: 18 }]}>{value}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.sectionTitle, { fontSize: 15, marginTop: 16 }]}>
              Transactions ({txReport?.rows?.length ?? 0})
            </Text>
            {(txReport?.rows ?? []).length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💳</Text>
                <Text style={styles.emptyText}>No transactions found</Text>
              </View>
            ) : (
              (txReport?.rows ?? []).map(tx => (
                <View key={tx.id} style={[styles.orderCard, { borderLeftWidth: 4, borderLeftColor: tx.paymentStatus === 'paid' ? '#10B981' : tx.paymentStatus === 'failed' ? '#EF4444' : '#F59E0B' }]}>
                  <View style={styles.orderCardTop}>
                    <Text style={styles.orderNum}>#{tx.orderNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: tx.paymentStatus === 'paid' ? '#10B981' : tx.paymentStatus === 'failed' ? '#EF4444' : '#F59E0B' }]}>
                      <Text style={styles.statusBadgeText}>{(tx.paymentStatus ?? 'pending').toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.orderMeta}>₦{parseFloat(String(tx.total)).toLocaleString()} · {tx.paymentMethod ?? 'N/A'} · {tx.orderType}</Text>
                  {tx.paymentReference ? <Text style={[styles.orderMeta, { fontSize: 11 }]}>Ref: {tx.paymentReference}</Text> : null}
                  <Text style={[styles.orderMeta, { fontSize: 11 }]}>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* ── PROMOS TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'promos' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1E1060" />}>
          <View style={styles.section}>
            <View style={styles.mealsHeader}>
              <Text style={styles.sectionTitle}>Promo Codes</Text>
              <TouchableOpacity style={[styles.addMealBtn, { backgroundColor: '#1E1060' }]}
                onPress={() => { setPromoForm(EMPTY_PROMO); setEditingPromoId(null); setShowPromoForm(true); }}>
                <Text style={styles.addMealBtnText}>+ New Promo</Text>
              </TouchableOpacity>
            </View>
            {(allPromoCodes ?? []).length === 0 ? (
              <View style={styles.empty}><Text style={styles.emptyEmoji}>🎟️</Text><Text style={styles.emptyText}>No promo codes yet</Text></View>
            ) : (
              (allPromoCodes ?? []).map(promo => (
                <View key={promo.id} style={[styles.mealCard, { borderLeftWidth: 4, borderLeftColor: promo.isActive ? '#22C55E' : '#9B94C4' }]}>
                  <View style={styles.mealCardTop}>
                    <View>
                      <Text style={[styles.mealName, { color: '#1E1060' }]}>{promo.code}</Text>
                      <Text style={styles.mealDesc}>{promo.description ?? 'No description'}</Text>
                    </View>
                    <View style={styles.mealBadges}>
                      <View style={[styles.availBadge, { backgroundColor: promo.isActive ? '#22C55E' : '#9B94C4' }]}>
                        <Text style={styles.availBadgeText}>{promo.isActive ? 'ACTIVE' : 'OFF'}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.mealPrice}>
                    {promo.type === 'percentage' ? `${promo.value}% off` : promo.type === 'fixed' ? `₦${Number(promo.value).toLocaleString()} off` : promo.type === 'free_delivery' ? 'Free Delivery' : 'BOGO'}
                    {promo.minOrderAmount && Number(promo.minOrderAmount) > 0 ? `  ·  Min ₦${Number(promo.minOrderAmount).toLocaleString()}` : ''}
                  </Text>
                  <Text style={[styles.mealDesc, { marginTop: 2 }]}>
                    Used {promo.usageCount}{promo.usageLimit ? `/${promo.usageLimit}` : ''} times
                    {promo.expiresAt ? `  ·  Expires ${new Date(promo.expiresAt).toLocaleDateString()}` : ''}
                  </Text>
                  <View style={styles.mealActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => {
                      setPromoForm({
                        code: promo.code, description: promo.description ?? '',
                        type: promo.type as PromoForm['type'], value: String(promo.value),
                        minOrderAmount: String(promo.minOrderAmount ?? '0'),
                        maxDiscount: String(promo.maxDiscount ?? ''), usageLimit: String(promo.usageLimit ?? ''),
                        perUserLimit: String(promo.perUserLimit), isActive: promo.isActive,
                        startsAt: promo.startsAt ? new Date(promo.startsAt).toISOString().slice(0, 10) : '',
                        expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString().slice(0, 10) : '',
                      });
                      setEditingPromoId(promo.id);
                      setShowPromoForm(true);
                    }}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toggleBtn} onPress={() => togglePromo.mutate({ id: promo.id, isActive: !promo.isActive })}>
                      <Text style={styles.toggleBtnText}>{promo.isActive ? 'Deactivate' : 'Activate'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() =>
                      Alert.alert('Delete Promo', `Delete "${promo.code}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deletePromo.mutate({ id: promo.id }) },
                      ])}>
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {showPromoForm && (
        <View style={styles.modalOverlay}>
          <ScrollView style={{ width: '100%' }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 40 }}>
            <View style={[styles.modal, { width: '92%' }]}>
              <Text style={styles.modalTitle}>{editingPromoId ? 'Edit Promo Code' : 'New Promo Code'}</Text>
              {([
                { label: 'Code (e.g. SAVE20)', key: 'code' as keyof PromoForm, placeholder: 'SUMMER20' },
                { label: 'Description', key: 'description' as keyof PromoForm, placeholder: 'Summer discount' },
                { label: 'Value (% or ₦)', key: 'value' as keyof PromoForm, placeholder: '20' },
                { label: 'Min Order Amount (₦)', key: 'minOrderAmount' as keyof PromoForm, placeholder: '0' },
                { label: 'Max Discount (₦, optional)', key: 'maxDiscount' as keyof PromoForm, placeholder: '' },
                { label: 'Usage Limit (optional)', key: 'usageLimit' as keyof PromoForm, placeholder: '' },
                { label: 'Per User Limit', key: 'perUserLimit' as keyof PromoForm, placeholder: '1' },
                { label: 'Starts At (YYYY-MM-DD)', key: 'startsAt' as keyof PromoForm, placeholder: '' },
                { label: 'Expires At (YYYY-MM-DD)', key: 'expiresAt' as keyof PromoForm, placeholder: '' },
              ]).map(({ label, key, placeholder }) => (
                <View key={key as string}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput style={styles.input} value={String(promoForm[key])}
                    onChangeText={v => setPromoForm(f => ({ ...f, [key]: v }))}
                    placeholder={placeholder} placeholderTextColor="#B09080" returnKeyType="done"
                    autoCapitalize={key === 'code' ? 'characters' : 'none'} />
                </View>
              ))}
              <Text style={styles.inputLabel}>Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {(['percentage', 'fixed', 'free_delivery', 'bogo'] as const).map(t => (
                  <TouchableOpacity key={t} onPress={() => setPromoForm(f => ({ ...f, type: t }))}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: promoForm.type === t ? '#1E1060' : '#F0EEF9' }}>
                    <Text style={{ color: promoForm.type === t ? '#FFF' : '#1E1060', fontWeight: '700', fontSize: 12 }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Active</Text>
                <Switch value={promoForm.isActive} onValueChange={v => setPromoForm(f => ({ ...f, isActive: v }))} />
              </View>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowPromoForm(false); setEditingPromoId(null); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#1E1060' }]} onPress={() => {
                  const payload = {
                    code: promoForm.code.toUpperCase(),
                    description: promoForm.description || undefined,
                    type: promoForm.type,
                    value: parseFloat(promoForm.value) || 0,
                    minOrderAmount: parseFloat(promoForm.minOrderAmount) || 0,
                    maxDiscount: promoForm.maxDiscount ? parseFloat(promoForm.maxDiscount) : undefined,
                    usageLimit: promoForm.usageLimit ? parseInt(promoForm.usageLimit) : undefined,
                    perUserLimit: parseInt(promoForm.perUserLimit) || 1,
                    isActive: promoForm.isActive,
                    startsAt: promoForm.startsAt || undefined,
                    expiresAt: promoForm.expiresAt || undefined,
                  };
                  if (editingPromoId) { updatePromo.mutate({ id: editingPromoId, ...payload }); }
                  else { createPromo.mutate(payload); }
                }}>
                  <Text style={styles.saveBtnText}>{editingPromoId ? 'Save Changes' : 'Create Promo'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}

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
