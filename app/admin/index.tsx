import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ScrollView, TextInput, Switch, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { useRequireRole } from "@/hooks/use-require-role";
import { LoadingState } from "@/components/ui";
import { useEffect } from 'react';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// ── CSV helpers ──────────────────────────────────────────────────────────────
function escapeCsv(val: unknown): string {
  const s = val == null ? '' : String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

async function downloadTransactionsCsv(
  rows: Array<{
    orderNumber: string; createdAt: Date | string | null;
    status: string; paymentStatus: string; paymentMethod: string;
    paymentReference: string | null; total: string | number; orderType: string;
  }>,
  fromDate: string, toDate: string,
) {
  const header = ['Order #', 'Date', 'Status', 'Payment Status', 'Method', 'Reference', 'Total (₦)', 'Type'];
  const csvLines = [
    header.join(','),
    ...rows.map(r => [
      escapeCsv(r.orderNumber),
      escapeCsv(r.createdAt ? new Date(r.createdAt).toISOString() : ''),
      escapeCsv(r.status),
      escapeCsv(r.paymentStatus),
      escapeCsv(r.paymentMethod),
      escapeCsv(r.paymentReference ?? ''),
      escapeCsv(Number(r.total).toFixed(2)),
      escapeCsv(r.orderType),
    ].join(',')),
  ];
  const csvContent = csvLines.join('\n');
  const dateTag = `${fromDate || 'all'}_to_${toDate || 'now'}`;
  const filename = `amala_transactions_${dateTag}.csv`;

  if (Platform.OS === 'web') {
    // Web: trigger browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    return;
  }

  // Native: write to cache dir and share
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Transactions' });
  } else {
    Alert.alert('Sharing unavailable', 'Cannot share files on this device.');
  }
}

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
  created: '#6B6490', awaiting_payment: '#F59E0B', payment_confirmed: '#3B82F6',
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
  const { allowed, loading: roleLoading } = useRequireRole(["admin"]);

  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // ── Role-based access guard (FR-006) ─────────────────────────────────────
  const { data: myProfile, isLoading: profileLoading } = trpc.profile.me.useQuery();
  const ALLOWED_ROLES = ['admin', 'kitchen', 'manager'];
  const hasAccess = myProfile && ALLOWED_ROLES.includes((myProfile as { role?: string }).role ?? '');

  useEffect(() => {
    if (!profileLoading && myProfile && !hasAccess) {
      Alert.alert('Access Denied', 'You do not have permission to access the admin dashboard.', [
        { text: 'Go Back', onPress: () => router.replace('/(tabs)' as never) },
      ]);
    }
  }, [profileLoading, myProfile, hasAccess]);

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
  // ── Dine-in revenue data ─────────────────────────────────────────────────
  const { data: dineInSummary, refetch: refetchDineIn } = trpc.admin.dineInRevenueSummary.useQuery(
    undefined, { retry: 1, refetchInterval: 60_000 }
  );
  const { data: dailyByType, refetch: refetchDailyByType } = trpc.admin.dailyRevenueByType.useQuery(
    undefined, { retry: 1, refetchInterval: 60_000 }
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
    await Promise.all([refetchDineIn(), refetchDailyByType()]);
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

  if (roleLoading) return <LoadingState fullScreen message="Checking access..." />;
  if (!allowed) return null;

  // Show loading while checking role
  if (profileLoading) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: '#6B6490' }}>Checking access…</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Block non-admin roles
  if (!hasAccess) {
    return (
      <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#201060', marginBottom: 8 }}>Access Denied</Text>
          <Text style={{ fontSize: 15, color: '#6B6490', textAlign: 'center', marginBottom: 24 }}>
            You need admin, kitchen, or manager access to view this dashboard.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#D02010', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => router.replace('/(tabs)' as never)}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <LinearGradient colors={['#201060', '#3D1A0F']} style={styles.header}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D02010" />}
      >
        {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <View style={styles.statsGrid}>
              {[
                { label: "Today's Orders", value: overview?.todayOrders ?? '—', icon: '📦', color: '#D02010' },
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

            {/* ── Dine-In Revenue Section ─────────────────────────────── */}
            <Text style={styles.sectionTitle}>🍽️ Dine-In Revenue</Text>
            <View style={styles.dineInGrid}>
              {[
                { label: "Today", value: dineInSummary?.today ?? 0, count: dineInSummary?.todayCount ?? 0, color: '#7C3AED' },
                { label: "This Week", value: dineInSummary?.thisWeek ?? 0, count: dineInSummary?.weekCount ?? 0, color: '#2563EB' },
                { label: "This Month", value: dineInSummary?.thisMonth ?? 0, count: dineInSummary?.monthCount ?? 0, color: '#059669' },
              ].map((item) => (
                <View key={item.label} style={[styles.dineInCard, { borderTopColor: item.color }]}>
                  <Text style={[styles.dineInAmount, { color: item.color }]}>₦{Number(item.value).toLocaleString()}</Text>
                  <Text style={styles.dineInLabel}>{item.label}</Text>
                  <Text style={styles.dineInCount}>{item.count} order{item.count !== 1 ? 's' : ''}</Text>
                </View>
              ))}
            </View>

            {/* 7-day stacked breakdown */}
            {dailyByType && dailyByType.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Revenue by Type — Last 7 Days</Text>
                <View style={styles.chartLegend}>
                  {[['#D02010', 'Delivery'], ['#F59E0B', 'Pickup'], ['#7C3AED', 'Dine-In']].map(([color, label]) => (
                    <View key={label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: color }]} />
                      <Text style={styles.legendText}>{label}</Text>
                    </View>
                  ))}
                </View>
                {dailyByType.map((day) => {
                  const maxVal = Math.max(...(dailyByType as any[]).map((d: any) => d.total), 1);
                  const barW = (val: number) => `${Math.max((val / maxVal) * 100, val > 0 ? 2 : 0)}%`;
                  const dayLabel = new Date(day.day + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric' });
                  return (
                    <View key={day.day} style={styles.barRow}>
                      <Text style={styles.barDayLabel}>{dayLabel}</Text>
                      <View style={styles.barTrack}>
                        {day.delivery > 0 && <View style={[styles.barSegment, { width: barW(day.delivery) as any, backgroundColor: '#D02010' }]} />}
                        {day.pickup > 0 && <View style={[styles.barSegment, { width: barW(day.pickup) as any, backgroundColor: '#F59E0B' }]} />}
                        {day.dine_in > 0 && <View style={[styles.barSegment, { width: barW(day.dine_in) as any, backgroundColor: '#7C3AED' }]} />}
                      </View>
                      <Text style={styles.barTotal}>₦{Number(day.total).toLocaleString()}</Text>
                    </View>
                  );
                })}
              </View>
            )}

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
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] ?? '#6B6490' }]}>
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
                    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[order.status] ?? '#6B6490' }]}>
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
                placeholderTextColor="#9B94C4"
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D02010" />}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Report</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>From (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={reportFrom} onChangeText={setReportFrom}
                  placeholder="2025-01-01" placeholderTextColor="#9B94C4" returnKeyType="done" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>To (YYYY-MM-DD)</Text>
                <TextInput style={styles.input} value={reportTo} onChangeText={setReportTo}
                  placeholder="2025-12-31" placeholderTextColor="#9B94C4" returnKeyType="done" />
              </View>
            </View>
            <TouchableOpacity style={styles.addMealBtn} onPress={() => refetchReport()}>
              <Text style={styles.addMealBtnText}>🔍 Apply Filter</Text>
            </TouchableOpacity>
            {(txReport?.rows ?? []).length > 0 && (
              <TouchableOpacity
                style={[styles.addMealBtn, { backgroundColor: '#201060', marginTop: 8 }]}
                onPress={() => downloadTransactionsCsv(txReport!.rows, reportFrom, reportTo)}>
                <Text style={styles.addMealBtnText}>⬇️ Download CSV</Text>
              </TouchableOpacity>
            )}
            {txReport?.summary && (
              <View style={[styles.statsGrid, { marginTop: 16 }]}>
                {([
                  ['Total Orders', txReport.summary.totalOrders, '📦', '#D02010'],
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#201060" />}>
          <View style={styles.section}>
            <View style={styles.mealsHeader}>
              <Text style={styles.sectionTitle}>Promo Codes</Text>
              <TouchableOpacity style={[styles.addMealBtn, { backgroundColor: '#201060' }]}
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
                      <Text style={[styles.mealName, { color: '#201060' }]}>{promo.code}</Text>
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
                    placeholder={placeholder} placeholderTextColor="#9B94C4" returnKeyType="done"
                    autoCapitalize={key === 'code' ? 'characters' : 'none'} />
                </View>
              ))}
              <Text style={styles.inputLabel}>Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {(['percentage', 'fixed', 'free_delivery', 'bogo'] as const).map(t => (
                  <TouchableOpacity key={t} onPress={() => setPromoForm(f => ({ ...f, type: t }))}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: promoForm.type === t ? '#201060' : '#F0EEF9' }}>
                    <Text style={{ color: promoForm.type === t ? '#FFF' : '#201060', fontWeight: '700', fontSize: 12 }}>{t}</Text>
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
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#201060' }]} onPress={() => {
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

  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EDEAFB' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2.5, borderBottomColor: '#D02010' },
  tabBtnText: { fontSize: 11, fontWeight: '600', color: '#6B6490' },
  tabBtnTextActive: { color: '#D02010' },

  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#201060', marginBottom: 12, marginTop: 8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    borderLeftWidth: 4, shadowColor: '#1A1640', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#6B6490', fontWeight: '600' },

  orderCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  orderCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNum: { fontSize: 16, fontWeight: '800', color: '#201060' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  orderMeta: { fontSize: 13, color: '#6B6490', marginBottom: 2 },
  orderAddress: { fontSize: 12, color: '#6B6490', marginTop: 4, marginBottom: 4 },
  orderActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  actionBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  mealsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addMealBtn: { backgroundColor: '#D02010', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addMealBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
  searchBox: {
    backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#EDEAFB', marginBottom: 12,
  },
  searchInput: { fontSize: 14, color: '#201060' },
  mealCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  mealCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  mealName: { fontSize: 15, fontWeight: '800', color: '#201060' },
  mealPrice: { fontSize: 14, fontWeight: '700', color: '#D02010', marginTop: 2 },
  mealDesc: { fontSize: 12, color: '#6B6490', lineHeight: 17, marginBottom: 8 },
  mealBadges: { alignItems: 'flex-end' },
  availBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  availBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  mealActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  toggleBtn: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  toggleBtnText: { fontSize: 12, fontWeight: '700', color: '#201060' },
  deleteBtn: { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { fontSize: 14 },

  riderCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  riderCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  riderStatus: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  riderName: { fontSize: 15, fontWeight: '800', color: '#201060' },
  riderMeta: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  riderBadges: { alignItems: 'flex-end' },
  riderLocation: { fontSize: 12, color: '#6B6490', marginTop: 4 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 15, color: '#6B6490' },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  modal: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#201060', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#6B6490', marginBottom: 4 },
  input: {
    backgroundColor: '#F4F3FB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#201060', borderWidth: 1.5, borderColor: '#EDEAFB', marginBottom: 12,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#6B6490' },
  saveBtn: { flex: 1, backgroundColor: '#D02010', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  // Dine-in revenue
  dineInGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dineInCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderTopWidth: 3, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  dineInAmount: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
  dineInLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
  dineInCount: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  // Revenue chart
  chartContainer: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  chartTitle: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 10 },
  chartLegend: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#374151', fontWeight: '600' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  barDayLabel: { fontSize: 10, color: '#6B7280', width: 42, fontWeight: '600' },
  barTrack: { flex: 1, height: 18, flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  barSegment: { height: 18 },
  barTotal: { fontSize: 10, color: '#374151', fontWeight: '700', width: 60, textAlign: 'right' },
});
