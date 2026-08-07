import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Switch, RefreshControl, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { trpc } from '@/lib/trpc';
import { useRequireRole } from "@/hooks/use-require-role";
import { LoadingState } from "@/components/ui";

const STATUS_LABEL: Record<string, string> = {
  rider_assigned: 'Assigned',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  payment_confirmed: 'Confirmed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, string> = {
  rider_assigned: '#F59E0B',
  out_for_delivery: '#0EA5E9',
  delivered: '#22C55E',
  cancelled: '#EF4444',
};

export default function RiderPortal() {
  const { allowed, loading: roleLoading } = useRequireRole(["rider"]);
  if (roleLoading) return <LoadingState fullScreen message="Checking access..." />;
  if (!allowed) return null;
  return <RiderPortalContent />;
}

function RiderPortalContent() {
  const [isOnline, setIsOnline] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);
  const locationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Role check via live DB profile
  const { data: myProfile, isLoading: profileLoading } = trpc.profile.me.useQuery(undefined, { retry: 1 });

  // Rider's assigned orders
  const { data: myOrders = [], refetch: refetchOrders, isLoading: ordersLoading } = trpc.rider.myOrders.useQuery(
    undefined,
    { enabled: myProfile?.role === 'rider', refetchInterval: 30000 }
  );
  const activeDeliveryOrderId = myOrders.find((order: any) =>
    ['rider_assigned', 'out_for_delivery'].includes(order.status)
  )?.id;

  const { mutateAsync: updateLocation } = trpc.rider.updateLocation.useMutation();
  const { mutateAsync: setStatus } = trpc.rider.setStatus.useMutation();
  const { mutateAsync: updateOrder } = trpc.rider.updateOrderStatus.useMutation();

  // Request location permission on mount
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') { setLocationGranted(true); return; }
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    })();
    return () => { if (locationInterval.current) clearInterval(locationInterval.current); };
  }, []);

  // Start/stop broadcasting location when going online/offline
  useEffect(() => {
    if (locationInterval.current) clearInterval(locationInterval.current);
    if (isOnline && activeDeliveryOrderId && locationGranted && Platform.OS !== 'web') {
      const broadcast = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          await updateLocation({ orderId: activeDeliveryOrderId, latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch {}
      };
      broadcast();
      locationInterval.current = setInterval(broadcast, 15000); // every 15s
    }
  }, [isOnline, activeDeliveryOrderId, locationGranted, updateLocation]);

  const handleToggleOnline = useCallback(async (val: boolean) => {
    if (val && !locationGranted && Platform.OS !== 'web') {
      Alert.alert('Location Required', 'Please enable location permission to go online.');
      return;
    }
    try {
      await setStatus({ isOnline: val });
      setIsOnline(val);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not update status.');
    }
  }, [locationGranted, setStatus]);

  const handleUpdateOrderStatus = useCallback(async (orderId: number, status: 'out_for_delivery' | 'delivered') => {
    setUpdatingOrder(orderId);
    try {
      await updateOrder({ orderId, status });
      await refetchOrders();
      Alert.alert('Updated', status === 'delivered' ? '✅ Order marked as delivered!' : '🛵 Order marked as out for delivery!');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not update order status.');
    } finally {
      setUpdatingOrder(null);
    }
  }, [refetchOrders, updateOrder]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchOrders();
    setRefreshing(false);
  }, [refetchOrders]);

  // Loading state
  if (profileLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#D02010" />
        <Text style={s.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Role gate: only rider, admin, manager
  const allowedRoles = ['rider'];
  if (!myProfile || !allowedRoles.includes(myProfile.role ?? '')) {
    return (
      <View style={s.center}>
        <Text style={s.lockIcon}>🔒</Text>
        <Text style={s.accessDenied}>Access Denied</Text>
        <Text style={s.accessSub}>Rider Portal is only accessible to registered riders.</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace('/(tabs)' as never)}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeOrders = myOrders.filter((o: any) => ['rider_assigned', 'out_for_delivery'].includes(o.status));
  const completedToday = myOrders.filter((o: any) => o.status === 'delivered').length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)' as never)}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Rider Portal</Text>
        <Text style={s.subtitle}>Welcome, {myProfile.name?.split(' ')[0] ?? 'Rider'}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D02010" />}
      >
        {/* Online Toggle */}
        <View style={s.onlineCard}>
          <View style={s.onlineLeft}>
            <View style={[s.statusDot, isOnline ? s.dotOnline : s.dotOffline]} />
            <View>
              <Text style={s.onlineLabel}>{isOnline ? 'You are Online' : 'You are Offline'}</Text>
              <Text style={s.onlineSub}>{isOnline ? 'Receiving delivery requests' : 'Toggle to start receiving orders'}</Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#E8E6F4', true: '#22C55E' }}
            thumbColor={isOnline ? '#FFF' : '#9BA1A6'}
          />
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>{activeOrders.length}</Text>
            <Text style={s.statLabel}>Active</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{completedToday}</Text>
            <Text style={s.statLabel}>Delivered Today</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statNum}>{myOrders.length}</Text>
            <Text style={s.statLabel}>Total Orders</Text>
          </View>
        </View>

        {/* Location Status */}
        {Platform.OS !== 'web' && (
          <View style={[s.locBanner, locationGranted ? s.locOk : s.locWarn]}>
            <Text style={s.locText}>
              {locationGranted ? '📍 Location access granted — broadcasting every 15s when online' : '⚠️ Location permission required to go online'}
            </Text>
          </View>
        )}

        {/* Active Orders */}
        <Text style={s.sectionTitle}>Active Orders ({activeOrders.length})</Text>
        {ordersLoading ? (
          <ActivityIndicator color="#D02010" style={{ marginTop: 20 }} />
        ) : activeOrders.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyIcon}>🛵</Text>
            <Text style={s.emptyText}>{isOnline ? 'No active orders. Waiting for assignments...' : 'Go online to receive delivery orders.'}</Text>
          </View>
        ) : (
          activeOrders.map((order: any) => (
            <View key={order.id} style={s.orderCard}>
              <View style={s.orderHeader}>
                <Text style={s.orderId}>Order #{order.id}</Text>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[order.status] ?? '#6B6490' }]}>
                  <Text style={s.badgeText}>{STATUS_LABEL[order.status] ?? order.status}</Text>
                </View>
              </View>
              <Text style={s.orderAddr}>📍 {order.deliveryAddress ?? 'Pickup order'}</Text>
              <Text style={s.orderTotal}>₦{Number(order.total).toLocaleString()}</Text>
              <View style={s.orderActions}>
                {order.status === 'rider_assigned' && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.btnPrimary, updatingOrder === order.id && s.btnDisabled]}
                    onPress={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                    disabled={updatingOrder === order.id}
                  >
                    {updatingOrder === order.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.actionBtnText}>🛵 Start Delivery</Text>}
                  </TouchableOpacity>
                )}
                {order.status === 'out_for_delivery' && (
                  <TouchableOpacity
                    style={[s.actionBtn, s.btnSuccess, updatingOrder === order.id && s.btnDisabled]}
                    onPress={() => handleUpdateOrderStatus(order.id, 'delivered')}
                    disabled={updatingOrder === order.id}
                  >
                    {updatingOrder === order.id ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.actionBtnText}>✅ Mark Delivered</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {/* Completed Orders */}
        {myOrders.filter((o: any) => o.status === 'delivered').length > 0 && (
          <>
            <Text style={s.sectionTitle}>Completed Orders</Text>
            {myOrders.filter((o: any) => o.status === 'delivered').map((order: any) => (
              <View key={order.id} style={[s.orderCard, s.orderCardDone]}>
                <View style={s.orderHeader}>
                  <Text style={s.orderId}>Order #{order.id}</Text>
                  <View style={[s.badge, { backgroundColor: '#22C55E' }]}>
                    <Text style={s.badgeText}>Delivered ✓</Text>
                  </View>
                </View>
                <Text style={s.orderAddr}>📍 {order.deliveryAddress ?? 'Pickup'}</Text>
                <Text style={s.orderTotal}>₦{Number(order.total).toLocaleString()}</Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  loadingText: { color: '#6B6490', fontSize: 16 },
  lockIcon: { fontSize: 48 },
  accessDenied: { fontSize: 22, fontWeight: '800', color: '#201060' },
  accessSub: { fontSize: 15, color: '#6B6490', textAlign: 'center' },
  backBtn: { backgroundColor: '#201060', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  backBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  header: { backgroundColor: '#201060', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  back: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  subtitle: { fontSize: 14, color: '#A8A9D8', marginTop: 4 },
  scroll: { flex: 1 },
  onlineCard: {
    backgroundColor: '#FFF', margin: 16, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E8E6F4', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  onlineLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  dotOnline: { backgroundColor: '#22C55E' },
  dotOffline: { backgroundColor: '#9BA1A6' },
  onlineLabel: { fontSize: 16, fontWeight: '700', color: '#201060' },
  onlineSub: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E8E6F4' },
  statNum: { fontSize: 24, fontWeight: '900', color: '#D02010' },
  statLabel: { fontSize: 11, color: '#6B6490', marginTop: 2, textAlign: 'center' },
  locBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, padding: 10 },
  locOk: { backgroundColor: '#D5F5E3' },
  locWarn: { backgroundColor: '#FEF3C7' },
  locText: { fontSize: 12, color: '#374151', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#201060', paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  emptyCard: { backgroundColor: '#FFF', margin: 16, borderRadius: 14, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E8E6F4' },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: '#6B6490', textAlign: 'center' },
  orderCard: {
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#E8E6F4', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  orderCardDone: { opacity: 0.75 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: '800', color: '#201060' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  orderAddr: { fontSize: 13, color: '#6B6490', marginBottom: 4 },
  orderTotal: { fontSize: 15, fontWeight: '700', color: '#D02010', marginBottom: 12 },
  orderActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#D02010' },
  btnSuccess: { backgroundColor: '#22C55E' },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
