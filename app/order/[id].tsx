import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';

const STATUS_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', icon: '✅', desc: 'Your order has been received' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', desc: 'The kitchen is preparing your meal' },
  { key: 'ready', label: 'Ready', icon: '🍽️', desc: 'Your meal is ready' },
  { key: 'on_the_way', label: 'On the Way', icon: '🛵', desc: 'Your order is on its way' },
  { key: 'delivered', label: 'Delivered', icon: '🎉', desc: 'Enjoy your meal!' },
];

const PICKUP_STEPS = [
  { key: 'confirmed', label: 'Order Confirmed', icon: '✅', desc: 'Your order has been received' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', desc: 'The kitchen is preparing your meal' },
  { key: 'ready', label: 'Ready for Pickup', icon: '🥡', desc: 'Your order is ready at the branch' },
  { key: 'delivered', label: 'Collected', icon: '🎉', desc: 'Thank you for dining with us!' },
];

export default function OrderDetailScreen() {
  const { id, isNew } = useLocalSearchParams<{ id: string; isNew?: string }>();
  const { state } = useAppStore();
  const order = state.orders.find(o => o.id === id);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

  const steps = order?.orderType === 'pickup' ? PICKUP_STEPS : STATUS_STEPS;

  useEffect(() => {
    if (!order) return;
    const idx = steps.findIndex(s => s.key === order.status);
    setCurrentStatusIndex(idx >= 0 ? idx : 0);

    // Simulate order progression for demo
    if (isNew === 'true') {
      const timers: ReturnType<typeof setTimeout>[] = [];
      timers.push(setTimeout(() => setCurrentStatusIndex(1), 3000));
      timers.push(setTimeout(() => setCurrentStatusIndex(2), 8000));
      return () => timers.forEach(clearTimeout);
    }
  }, [order?.id]);

  if (!order) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Order not found</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)' as never)}>
          <Text style={styles.homeLink}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStep = steps[currentStatusIndex];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        {isNew === 'true' && (
          <View style={styles.successHeader}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successTitle}>Order Placed!</Text>
            <Text style={styles.successSubtitle}>Your order has been confirmed</Text>
          </View>
        )}

        {/* Order Info */}
        <View style={styles.orderInfo}>
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <View style={styles.orderTypeBadge}>
              <Text style={styles.orderTypeBadgeText}>
                {order.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Pickup'}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>
            {new Date(order.createdAt).toLocaleDateString('en-NG', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Live Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>Order Status</Text>
          <View style={styles.currentStatus}>
            <Text style={styles.currentStatusIcon}>{currentStep.icon}</Text>
            <View>
              <Text style={styles.currentStatusLabel}>{currentStep.label}</Text>
              <Text style={styles.currentStatusDesc}>{currentStep.desc}</Text>
            </View>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressSteps}>
            {steps.map((step, i) => (
              <View key={step.key} style={styles.progressStep}>
                <View style={styles.progressLeft}>
                  <View style={[
                    styles.progressDot,
                    i <= currentStatusIndex && styles.progressDotActive,
                    i === currentStatusIndex && styles.progressDotCurrent,
                  ]}>
                    <Text style={styles.progressDotText}>
                      {i < currentStatusIndex ? '✓' : step.icon}
                    </Text>
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[styles.progressLine, i < currentStatusIndex && styles.progressLineActive]} />
                  )}
                </View>
                <View style={styles.progressContent}>
                  <Text style={[styles.progressLabel, i <= currentStatusIndex && styles.progressLabelActive]}>
                    {step.label}
                  </Text>
                  {i === currentStatusIndex && (
                    <Text style={styles.progressDesc}>{step.desc}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          {order.estimatedTime && currentStatusIndex < steps.length - 1 && (
            <View style={styles.etaBox}>
              <Text style={styles.etaText}>
                ⏱️ Estimated {order.orderType === 'delivery' ? 'delivery' : 'ready'} time: {order.estimatedTime} min
              </Text>
            </View>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items Ordered</Text>
          {order.items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}×</Text>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.meal?.name || 'Custom Meal'}
              </Text>
              <Text style={styles.itemPrice}>₦{item.totalPrice.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Method</Text>
            <Text style={styles.payValue}>{order.paymentMethod}</Text>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Status</Text>
            <View style={[styles.payStatusBadge, order.paymentStatus === 'paid' ? styles.paid : styles.pending]}>
              <Text style={styles.payStatusText}>
                {order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
              </Text>
            </View>
          </View>
          <View style={[styles.payRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid</Text>
            <Text style={styles.totalValue}>₦{order.total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/(tabs)/orders' as never)}
          >
            <Text style={styles.actionBtnText}>📋 View All Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => router.push('/(tabs)' as never)}
          >
            <Text style={styles.actionBtnTextSecondary}>🏠 Back to Home</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 18, color: '#1A0F0A', marginBottom: 12 },
  homeLink: { color: '#C0392B', fontSize: 16, fontWeight: '600' },
  successHeader: {
    backgroundColor: '#C0392B', paddingTop: 56, paddingBottom: 32,
    alignItems: 'center', paddingHorizontal: 20,
  },
  successEmoji: { fontSize: 56, marginBottom: 12 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#FFF', marginBottom: 6 },
  successSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  orderInfo: { padding: 20, paddingTop: 16 },
  orderInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderNumber: { fontSize: 20, fontWeight: '800', color: '#1A0F0A' },
  orderTypeBadge: { backgroundColor: '#FFF5EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  orderTypeBadgeText: { fontSize: 13, fontWeight: '700', color: '#6B3A2A' },
  orderDate: { fontSize: 13, color: '#8B6F5E' },
  statusCard: {
    marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1.5, borderColor: '#E8D5C4',
  },
  statusCardTitle: { fontSize: 17, fontWeight: '700', color: '#1A0F0A', marginBottom: 12 },
  currentStatus: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  currentStatusIcon: { fontSize: 36 },
  currentStatusLabel: { fontSize: 18, fontWeight: '700', color: '#1A0F0A' },
  currentStatusDesc: { fontSize: 13, color: '#8B6F5E', marginTop: 2 },
  progressSteps: { gap: 0 },
  progressStep: { flexDirection: 'row', gap: 12 },
  progressLeft: { alignItems: 'center', width: 32 },
  progressDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8D5C4',
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: '#27AE60' },
  progressDotCurrent: { backgroundColor: '#C0392B' },
  progressDotText: { fontSize: 12 },
  progressLine: { width: 2, flex: 1, backgroundColor: '#E8D5C4', minHeight: 20 },
  progressLineActive: { backgroundColor: '#27AE60' },
  progressContent: { flex: 1, paddingBottom: 16, paddingTop: 6 },
  progressLabel: { fontSize: 14, fontWeight: '600', color: '#8B6F5E' },
  progressLabelActive: { color: '#1A0F0A' },
  progressDesc: { fontSize: 12, color: '#8B6F5E', marginTop: 2 },
  etaBox: {
    backgroundColor: '#FFF5EC', borderRadius: 10, padding: 10, marginTop: 12,
  },
  etaText: { fontSize: 14, color: '#6B3A2A', fontWeight: '600', textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A0F0A', marginBottom: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  itemQty: { fontSize: 14, fontWeight: '700', color: '#C0392B', width: 28 },
  itemName: { flex: 1, fontSize: 14, color: '#1A0F0A' },
  itemPrice: { fontSize: 14, fontWeight: '700', color: '#1A0F0A' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  payLabel: { fontSize: 15, color: '#8B6F5E' },
  payValue: { fontSize: 15, fontWeight: '600', color: '#1A0F0A', textTransform: 'capitalize' },
  payStatusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  paid: { backgroundColor: '#D5F5E3' },
  pending: { backgroundColor: '#FFF5EC' },
  payStatusText: { fontSize: 13, fontWeight: '700', color: '#1A0F0A' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E8D5C4', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: '800', color: '#1A0F0A' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#C0392B' },
  actionsSection: { paddingHorizontal: 20, gap: 12 },
  actionBtn: {
    backgroundColor: '#C0392B', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  actionBtnSecondary: { backgroundColor: '#FFF', borderWidth: 2, borderColor: '#C0392B' },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  actionBtnTextSecondary: { color: '#C0392B', fontSize: 16, fontWeight: '700' },
});
