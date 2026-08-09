import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { trpc } from '@/lib/trpc';
import { RiderMap } from '@/components/rider-map';

// Full order lifecycle with status keys, labels, icons, and descriptions
const DELIVERY_STEPS = [
  { key: 'awaiting_payment',   label: 'Order Placed',       icon: '📋', desc: 'Your order has been placed' },
  { key: 'payment_confirmed',  label: 'Payment Confirmed',  icon: '✅', desc: 'Payment received' },
  { key: 'accepted',           label: 'Accepted',           icon: '👍', desc: 'Restaurant accepted your order' },
  { key: 'preparing',          label: 'Preparing',          icon: '👨‍🍳', desc: 'The kitchen is preparing your meal' },
  { key: 'ready',              label: 'Ready',              icon: '🍽️', desc: 'Your meal is ready for pickup by rider' },
  { key: 'rider_assigned',     label: 'Rider Assigned',     icon: '🛵', desc: 'A rider has been assigned' },
  { key: 'out_for_delivery',   label: 'On the Way',         icon: '🚴', desc: 'Your order is on its way' },
  { key: 'delivered',          label: 'Delivered',          icon: '🎉', desc: 'Enjoy your meal!' },
];

const PICKUP_STEPS = [
  { key: 'awaiting_payment',   label: 'Order Placed',       icon: '📋', desc: 'Your order has been placed' },
  { key: 'payment_confirmed',  label: 'Payment Confirmed',  icon: '✅', desc: 'Payment received' },
  { key: 'accepted',           label: 'Accepted',           icon: '👍', desc: 'Restaurant accepted your order' },
  { key: 'preparing',          label: 'Preparing',          icon: '👨‍🍳', desc: 'The kitchen is preparing your meal' },
  { key: 'ready',              label: 'Ready for Pickup',   icon: '🥡', desc: 'Your order is ready at the branch' },
  { key: 'delivered',          label: 'Collected',          icon: '🎉', desc: 'Thank you for dining with us!' },
];

const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: '#F59E0B',
  payment_confirmed: '#22C55E',
  accepted: '#22C55E',
  preparing: '#D02010',
  ready: '#0a7ea4',
  rider_assigned: '#0a7ea4',
  out_for_delivery: '#7C3AED',
  delivered: '#22C55E',
  completed: '#22C55E',
  cancelled: '#EF4444',
  rejected: '#EF4444',
  refunded: '#9BA1A6',
};

function RiderTracker({ orderId }: { orderId: number }) {
  const { data: loc, isLoading } = trpc.rider.getLocation.useQuery(
    { orderId },
    { refetchInterval: 10_000, enabled: !!orderId }
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

function formatTime(date: string | Date | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return null;
  return new Date(date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { data, isLoading, error } = trpc.orders.get.useQuery(
    { id: Number(id) },
    { enabled: !!id, refetchInterval: 15_000 }
  );
  const cancelMutation = trpc.orders.cancel.useMutation({
    onSuccess: () => {
      Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
      router.replace('/(tabs)/orders' as never);
    },
    onError: (err) => {
      Alert.alert('Cannot Cancel', err.message || 'This order can no longer be cancelled.');
    },
  });

  const order = data?.order;
  const items = data?.items ?? [];
  const steps = order?.orderType === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
  const stepIdx = order ? Math.max(0, steps.findIndex(st => st.key === order.status)) : 0;
  const currentStep = steps[stepIdx];
  const statusColor = STATUS_COLORS[order?.status ?? ''] ?? '#9BA1A6';
  const isTerminal = ['delivered', 'completed', 'cancelled', 'rejected', 'refunded'].includes(order?.status ?? '');
  // 5-minute cancellation window: only show if order is awaiting_payment or pending and placed < 5 min ago
  const canCancel = (() => {
    if (!order) return false;
    if (!['awaiting_payment', 'pending', 'payment_confirmed'].includes(order.status)) return false;
    const placed = new Date(order.createdAt).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - placed < fiveMinutes;
  })();

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This cannot be undone.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: () => cancelMutation.mutate({ orderId: Number(id), reason: 'Customer cancelled within 5-minute window' }),
        },
      ]
    );
  };

  const showRiderMap = order?.orderType === 'delivery' &&
    ['rider_assigned', 'out_for_delivery'].includes(order?.status ?? '') &&
    order?.riderId;

  if (isLoading) return <View style={s.center}><ActivityIndicator size="large" color="#D02010" /></View>;
  if (error || !order) return (
    <View style={s.center}>
      <Text style={s.notFound}>Order not found</Text>
      <TouchableOpacity onPress={() => router.replace('/(tabs)/home' as never)}>
        <Text style={s.link}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={['#201060', '#150B50']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.back}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerBody}>
          <Text style={s.headerTitle}>Order #{order.orderNumber}</Text>
          <Text style={s.headerDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: statusColor + '30', borderColor: statusColor }]}>
          <Text style={[s.statusPillText, { color: statusColor }]}>{currentStep?.label ?? order.status}</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Current Status Banner */}
        <View style={[s.banner, { backgroundColor: statusColor }]}>
          <Text style={s.bannerIcon}>{currentStep?.icon ?? '📋'}</Text>
          <View style={s.bannerText}>
            <Text style={s.bannerLabel}>{currentStep?.label ?? order.status}</Text>
            <Text style={s.bannerDesc}>{currentStep?.desc ?? ''}</Text>
          </View>
        </View>

        {/* ETA */}
        {order.estimatedDeliveryTime && !isTerminal && (
          <View style={s.eta}>
            <Text style={s.etaText}>
              ⏱️ Est. {order.orderType === 'delivery' ? 'delivery' : 'ready'} time: {order.estimatedDeliveryTime} min
            </Text>
          </View>
        )}

        {/* 5-minute cancellation window */}
        {canCancel && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={handleCancel}
            activeOpacity={0.8}
            disabled={cancelMutation.isPending}
          >
            <Text style={s.cancelBtnText}>
              {cancelMutation.isPending ? 'Cancelling...' : '✕ Cancel Order'}
            </Text>
            <Text style={s.cancelBtnHint}>Available for 5 minutes after placing</Text>
          </TouchableOpacity>
        )}

        {/* Timeline */}
        <View style={s.timelineCard}>
          <Text style={s.timelineTitle}>Order Timeline</Text>
          {steps.map((st, i) => {
            const isDone = i <= stepIdx;
            const isCurrent = i === stepIdx;
            const isLast = i === steps.length - 1;
            return (
              <View key={st.key} style={s.timelineRow}>
                {/* Left: connector line + dot */}
                <View style={s.timelineLeft}>
                  {i > 0 && (
                    <View style={[s.timelineLine, isDone && s.timelineLineDone]} />
                  )}
                  <View style={[
                    s.timelineDot,
                    isDone && s.timelineDotDone,
                    isCurrent && { backgroundColor: statusColor, borderColor: statusColor },
                  ]}>
                    {isDone && <Text style={s.timelineDotIcon}>{st.icon}</Text>}
                  </View>
                  {!isLast && (
                    <View style={[s.timelineLineBelow, isDone && !isCurrent && s.timelineLineDone]} />
                  )}
                </View>
                {/* Right: label + description + timestamp */}
                <View style={[s.timelineContent, isLast && { paddingBottom: 0 }]}>
                  <Text style={[s.timelineLabel, isDone && s.timelineLabelDone, isCurrent && { color: statusColor }]}>
                    {st.label}
                  </Text>
                  {isDone && (
                    <Text style={s.timelineDesc}>{st.desc}</Text>
                  )}
                  {/* Show timestamp for completed steps */}
                  {isDone && i === 0 && order.createdAt && (
                    <Text style={s.timelineTime}>{formatTime(order.createdAt)}</Text>
                  )}
                  {isDone && i > 0 && isCurrent && order.updatedAt && (
                    <Text style={s.timelineTime}>{formatTime(order.updatedAt)}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Live Rider Map */}
        {showRiderMap && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🗺️ Live Rider Tracking</Text>
            <RiderTracker orderId={order.id} />
          </View>
        )}

        {/* Pickup Code */}
        {order.orderType === 'pickup' && order.pickupCode && (
          <View style={s.pickupCard}>
            <Text style={s.pickupTitle}>Pickup Code</Text>
            <Text style={s.pickupCode}>{order.pickupCode}</Text>
            <Text style={s.pickupHint}>Show this code at the counter</Text>
          </View>
        )}

        {/* Items */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Items Ordered</Text>
          {items.map((item: any) => (
            <View key={item.id} style={s.itemRow}>
              <Text style={s.itemQty}>{item.quantity}×</Text>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.name}</Text>
                {item.specialInstructions && (
                  <Text style={s.itemNote}>📝 {item.specialInstructions}</Text>
                )}
              </View>
              <Text style={s.itemPrice}>₦{Number(item.subtotal).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Payment</Text>
          <View style={s.payRow}>
            <Text style={s.payLabel}>Method</Text>
            <Text style={s.payVal}>{order.paymentMethod?.replace(/_/g, ' ')}</Text>
          </View>
          <View style={s.payRow}>
            <Text style={s.payLabel}>Status</Text>
            <View style={[s.payBadge, order.paymentStatus === 'paid' ? s.paid : s.pendingBadge]}>
              <Text style={s.payBadgeText}>{order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}</Text>
            </View>
          </View>
          {order.discount && Number(order.discount) > 0 && (
            <View style={s.payRow}>
              <Text style={s.payLabel}>Discount</Text>
              <Text style={[s.payVal, { color: '#22C55E' }]}>-₦{Number(order.discount).toLocaleString()}</Text>
            </View>
          )}
          {order.deliveryFee && Number(order.deliveryFee) > 0 && (
            <View style={s.payRow}>
              <Text style={s.payLabel}>Delivery Fee</Text>
              <Text style={s.payVal}>₦{Number(order.deliveryFee).toLocaleString()}</Text>
            </View>
          )}
          <View style={[s.payRow, s.totalRow]}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalVal}>₦{Number(order.total).toLocaleString()}</Text>
          </View>
        </View>

        {/* Delivery address */}
        {order.orderType === 'delivery' && order.deliveryAddress && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Delivery Address</Text>
            <Text style={s.addressText}>📍 {order.deliveryAddress}</Text>
            {order.deliveryInstructions && (
              <Text style={s.addressNote}>📝 {order.deliveryInstructions}</Text>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFound: { fontSize: 18, fontWeight: '700', color: '#201060' },
  link: { color: '#D02010', fontSize: 16, fontWeight: '600' },

  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, gap: 8 },
  backBtn: { marginBottom: 4 },
  back: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600' },
  headerBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF' },
  headerDate: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  statusPill: { alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  statusPillText: { fontSize: 13, fontWeight: '700' },

  banner: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  bannerIcon: { fontSize: 36 },
  bannerText: { flex: 1 },
  bannerLabel: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  bannerDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  eta: { backgroundColor: '#FFF7E6', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F59E0B' },
  etaText: { color: '#92400E', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  timelineCard: { backgroundColor: '#FFF', margin: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E8E6F4' },
  timelineTitle: { fontSize: 16, fontWeight: '800', color: '#201060', marginBottom: 20 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineLine: { width: 2, height: 12, backgroundColor: '#E8E6F4', marginBottom: -2 },
  timelineLineBelow: { width: 2, flex: 1, minHeight: 16, backgroundColor: '#E8E6F4', marginTop: -2 },
  timelineLineDone: { backgroundColor: '#D02010' },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F4F3FB', borderWidth: 2, borderColor: '#E8E6F4',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineDotDone: { backgroundColor: '#FFF5F5', borderColor: '#D02010' },
  timelineDotIcon: { fontSize: 16 },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: '#9BA1A6', marginBottom: 2 },
  timelineLabelDone: { color: '#201060', fontWeight: '800' },
  timelineDesc: { fontSize: 12, color: '#6B6490', lineHeight: 18 },
  timelineTime: { fontSize: 11, color: '#9BA1A6', marginTop: 4, fontWeight: '600' },

  section: { backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E8E6F4' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#201060', marginBottom: 12 },

  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F4F3FB' },
  itemQty: { fontSize: 14, fontWeight: '700', color: '#D02010', width: 28 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#201060', fontWeight: '600' },
  itemNote: { fontSize: 12, color: '#9BA1A6', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#201060' },

  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4F3FB' },
  payLabel: { fontSize: 14, color: '#6B6490' },
  payVal: { fontSize: 14, fontWeight: '600', color: '#201060', textTransform: 'capitalize' },
  payBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paid: { backgroundColor: '#D5F5E3' },
  pendingBadge: { backgroundColor: '#FEF3C7' },
  payBadgeText: { fontSize: 12, fontWeight: '700' },
  totalRow: { borderBottomWidth: 0 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#201060' },
  totalVal: { fontSize: 18, fontWeight: '900', color: '#D02010' },

  pickupCard: { backgroundColor: '#201060', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 20, alignItems: 'center' },
  pickupTitle: { color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  pickupCode: { color: '#F0C000', fontSize: 40, fontWeight: '900', letterSpacing: 8 },
  pickupHint: { color: '#A8A9AD', fontSize: 13, marginTop: 8 },

  addressText: { fontSize: 14, color: '#201060', lineHeight: 20 },
  addressNote: { fontSize: 13, color: '#6B6490', marginTop: 6 },

  mapContainer: { borderRadius: 12, overflow: 'hidden', height: 220, position: 'relative' },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(32,16,96,0.85)', padding: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  mapOverlayText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  mapOverlayTime: { color: '#A8A9D8', fontSize: 11 },
  mapLoading: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F4F3FB', borderRadius: 12 },
  mapLoadingText: { color: '#6B6490', fontSize: 14 },
  cancelBtn: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center' as const,
    gap: 4,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#EF4444' },
  cancelBtnHint: { fontSize: 11, color: '#9BA1A6' },
});
