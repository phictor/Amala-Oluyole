import React, { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { trpc } from '@/lib/trpc';
import { RiderMap } from '@/components/rider-map';

const DELIVERY_STEPS = [
  { key: 'payment_confirmed', label: 'Order Confirmed', icon: '✅', desc: 'Your order has been received' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', desc: 'The kitchen is preparing your meal' },
  { key: 'ready', label: 'Ready', icon: '🍽️', desc: 'Your meal is ready' },
  { key: 'out_for_delivery', label: 'On the Way', icon: '🛵', desc: 'Your order is on its way' },
  { key: 'delivered', label: 'Delivered', icon: '🎉', desc: 'Enjoy your meal!' },
];
const PICKUP_STEPS = [
  { key: 'payment_confirmed', label: 'Order Confirmed', icon: '✅', desc: 'Your order has been received' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', desc: 'The kitchen is preparing your meal' },
  { key: 'ready', label: 'Ready for Pickup', icon: '🥡', desc: 'Your order is ready at the branch' },
  { key: 'delivered', label: 'Collected', icon: '🎉', desc: 'Thank you for dining with us!' },
];

// Rider tracking sub-component
function RiderTracker({ riderId }: { riderId: number }) {
  const { data: loc, isLoading } = trpc.rider.getLocation.useQuery(
    { riderId },
    { refetchInterval: 10_000, enabled: !!riderId }
  );
  if (isLoading) {
    return (
      <View style={s.mapLoading}>
        <ActivityIndicator color="#D02010" />
        <Text style={s.mapLoadingText}>Locating rider...</Text>
      </View>
    );
  }

  if (!loc?.latitude || !loc?.longitude) {
    return (
      <View style={s.mapLoading}>
        <Text style={s.mapLoadingText}>📍 Waiting for rider location...</Text>
      </View>
    );
  }
  return (
    <View style={s.mapContainer}>
      <RiderMap riderLat={loc.latitude} riderLng={loc.longitude} />
      <View style={s.mapOverlay}>
        <Text style={s.mapOverlayText}>🛵 Rider is on the way</Text>
        {loc.lastUpdate && (
          <Text style={s.mapOverlayTime}>
            Updated {Math.round((Date.now() - new Date(loc.lastUpdate).getTime()) / 1000)}s ago
          </Text>
        )}
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = trpc.orders.get.useQuery({ id: Number(id) }, { enabled: !!id, refetchInterval: 15_000 });
  const order = data?.order;
  const items = data?.items ?? [];
  const steps = order?.orderType === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
  const stepIdx = order ? Math.max(0, steps.findIndex(s => s.key === order.status)) : 0;
  const step = steps[stepIdx];

  // Show map when rider is assigned or out for delivery
  const showRiderMap = order?.orderType === 'delivery' &&
    ['rider_assigned', 'out_for_delivery'].includes(order?.status ?? '') &&
    order?.riderId;

  if (isLoading) return <View style={s.center}><ActivityIndicator size="large" color="#D02010" /></View>;
  if (error || !order) return (
    <View style={s.center}>
      <Text style={s.notFound}>Order not found</Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)' as never)}><Text style={s.link}>Go Home</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.headerTitle}>Order #{order.orderNumber}</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.banner}>
          <Text style={s.bannerIcon}>{step?.icon ?? '📋'}</Text>
          <Text style={s.bannerLabel}>{step?.label ?? order.status}</Text>
          <Text style={s.bannerDesc}>{step?.desc ?? ''}</Text>
        </View>
        <View style={s.stepsCard}>
          {steps.map((st, i) => (
            <View key={st.key} style={s.stepRow}>
              <View style={[s.dot, i <= stepIdx && s.dotActive]} />
              <Text style={[s.stepLabel, i <= stepIdx && s.stepLabelActive]}>{st.icon} {st.label}</Text>
            </View>
          ))}
        </View>

        {/* Live Rider Tracking Map */}
        {showRiderMap && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🗺️ Live Rider Tracking</Text>
            <RiderTracker riderId={order.riderId!} />
          </View>
        )}

        {order.orderType === 'pickup' && order.pickupCode && (
          <View style={s.pickupCard}>
            <Text style={s.pickupTitle}>Pickup Code</Text>
            <Text style={s.pickupCode}>{order.pickupCode}</Text>
            <Text style={s.pickupHint}>Show this code at the counter</Text>
          </View>
        )}
        {order.estimatedDeliveryTime && stepIdx < steps.length - 1 && (
          <View style={s.eta}><Text style={s.etaText}>⏱️ Est. {order.orderType === 'delivery' ? 'delivery' : 'ready'} time: {order.estimatedDeliveryTime} min</Text></View>
        )}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Items Ordered</Text>
          {items.map((item: any) => (
            <View key={item.id} style={s.itemRow}>
              <Text style={s.itemQty}>{item.quantity}×</Text>
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemPrice}>₦{Number(item.subtotal).toLocaleString()}</Text>
            </View>
          ))}
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment</Text>
          <View style={s.payRow}><Text style={s.payLabel}>Method</Text><Text style={s.payVal}>{order.paymentMethod}</Text></View>
          <View style={s.payRow}>
            <Text style={s.payLabel}>Status</Text>
            <View style={[s.payBadge, order.paymentStatus === 'paid' ? s.paid : s.pending]}>
              <Text style={s.payBadgeText}>{order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}</Text>
            </View>
          </View>
          <View style={[s.payRow, s.totalRow]}><Text style={s.totalLabel}>Total</Text><Text style={s.totalVal}>₦{Number(order.total).toLocaleString()}</Text></View>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFound: { fontSize: 18, fontWeight: '700', color: '#201060' },
  link: { color: '#D02010', fontSize: 16, fontWeight: '600' },
  header: { backgroundColor: '#201060', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  back: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  banner: { backgroundColor: '#D02010', padding: 24, alignItems: 'center', gap: 6 },
  bannerIcon: { fontSize: 40 },
  bannerLabel: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  bannerDesc: { fontSize: 14, color: '#FFD5D0', textAlign: 'center' },
  stepsCard: { backgroundColor: '#FFF', margin: 16, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E6F4', gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8E6F4' },
  dotActive: { backgroundColor: '#D02010' },
  stepLabel: { fontSize: 14, color: '#9BA1A6' },
  stepLabelActive: { color: '#201060', fontWeight: '700' },
  pickupCard: { backgroundColor: '#201060', margin: 16, borderRadius: 14, padding: 20, alignItems: 'center' },
  pickupTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  pickupCode: { color: '#F0C000', fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  pickupHint: { color: '#A8A9AD', fontSize: 13, marginTop: 8 },
  eta: { backgroundColor: '#FFF7E6', margin: 16, marginTop: 0, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F59E0B' },
  etaText: { color: '#92400E', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  section: { backgroundColor: '#FFF', margin: 16, marginTop: 0, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E6F4' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#201060', marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F4F3FB' },
  itemQty: { fontSize: 14, fontWeight: '700', color: '#D02010', width: 28 },
  itemName: { flex: 1, fontSize: 14, color: '#201060' },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#201060' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F4F3FB' },
  payLabel: { fontSize: 14, color: '#6B6490' },
  payVal: { fontSize: 14, fontWeight: '600', color: '#201060', textTransform: 'capitalize' },
  payBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paid: { backgroundColor: '#D5F5E3' },
  pending: { backgroundColor: '#FEF3C7' },
  payBadgeText: { fontSize: 12, fontWeight: '700' },
  totalRow: { borderBottomWidth: 0 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#201060' },
  totalVal: { fontSize: 18, fontWeight: '900', color: '#D02010' },
  // Map styles
  mapContainer: { borderRadius: 12, overflow: 'hidden', height: 220, position: 'relative' },
  map: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(32,16,96,0.85)', padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  mapOverlayText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  mapOverlayTime: { color: '#A8A9D8', fontSize: 11 },
  riderMarker: { backgroundColor: '#D02010', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#FFF' },
  riderMarkerIcon: { fontSize: 18 },
  mapLoading: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F4F3FB', borderRadius: 12 },
  mapLoadingText: { color: '#6B6490', fontSize: 14 },
});
