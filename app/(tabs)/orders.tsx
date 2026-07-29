import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';
import type { Order } from '@/lib/data/types';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  created: { label: 'Created', color: '#6B6490', bg: '#F4F3FB' },
  awaiting_payment: { label: 'Awaiting Payment', color: '#F39C12', bg: '#FFF9EC' },
  payment_confirmed: { label: 'Confirmed', color: '#27AE60', bg: '#D5F5E3' },
  accepted: { label: 'Accepted', color: '#27AE60', bg: '#D5F5E3' },
  preparing: { label: 'Preparing', color: '#E67E22', bg: '#F4F3FB' },
  ready: { label: 'Ready', color: '#2980B9', bg: '#EBF5FB' },
  rider_assigned: { label: 'Rider Assigned', color: '#8E44AD', bg: '#F5EEF8' },
  out_for_delivery: { label: 'On the Way', color: '#D02010', bg: '#FDECEA' },
  delivered: { label: 'Delivered', color: '#27AE60', bg: '#D5F5E3' },
  completed: { label: 'Completed', color: '#27AE60', bg: '#D5F5E3' },
  cancelled: { label: 'Cancelled', color: '#E74C3C', bg: '#FDECEA' },
  rejected: { label: 'Rejected', color: '#E74C3C', bg: '#FDECEA' },
  refunded: { label: 'Refunded', color: '#6B6490', bg: '#F5F5F5' },
};

const ACTIVE_STATUSES = ['created', 'awaiting_payment', 'payment_confirmed', 'accepted', 'preparing', 'ready', 'rider_assigned', 'out_for_delivery'];

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: '#6B6490', bg: '#F5F5F5' };
  const isActive = ACTIVE_STATUSES.includes(order.status);
  return (
    <TouchableOpacity style={[styles.orderCard, isActive && styles.orderCardActive]} onPress={onPress}>
      <View style={styles.orderCardHeader}>
        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>
      <Text style={styles.orderBranch}>{order.branchName}</Text>
      <Text style={styles.orderItems} numberOfLines={1}>
        {order.items.map(i => i.meal?.name || 'Custom Meal').join(', ')}
      </Text>
      <View style={styles.orderCardFooter}>
        <Text style={styles.orderTotal}>₦{order.total.toLocaleString()}</Text>
        <Text style={styles.orderDate}>
          {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
        </Text>
        <Text style={styles.orderType}>
          {order.orderType === 'delivery' ? '🛵' : '🥡'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { state } = useAppStore();
  const [tab, setTab] = useState<'active' | 'past'>('active');

  const activeOrders = state.orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = state.orders.filter(o => !ACTIVE_STATUSES.includes(o.status));
  const displayOrders = tab === 'active' ? activeOrders : pastOrders;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'active' && styles.tabBtnActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabBtnText, tab === 'active' && styles.tabBtnTextActive]}>
            Active {activeOrders.length > 0 && `(${activeOrders.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'past' && styles.tabBtnActive]}
          onPress={() => setTab('past')}
        >
          <Text style={[styles.tabBtnText, tab === 'past' && styles.tabBtnTextActive]}>
            Past Orders
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{tab === 'active' ? '🍽️' : '📋'}</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'active' ? 'No active orders' : 'No past orders'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {tab === 'active' ? 'Place an order to see it here' : 'Your order history will appear here'}
            </Text>
            <TouchableOpacity style={styles.orderNowBtn} onPress={() => router.push('/(tabs)/menu' as never)}>
              <Text style={styles.orderNowBtnText}>Order Now</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => router.push({ pathname: '/order/[id]' as never, params: { id: item.id } })}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#201060' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 12 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E6F4', backgroundColor: '#F4F3FB',
  },
  tabBtnActive: { backgroundColor: '#D02010', borderColor: '#D02010' },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: '#6B6490' },
  tabBtnTextActive: { color: '#FFF' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  orderCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#E8E6F4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  orderCardActive: { borderColor: '#D02010', borderWidth: 2 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNumber: { fontSize: 16, fontWeight: '800', color: '#201060' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderBranch: { fontSize: 13, color: '#6B6490', marginBottom: 4 },
  orderItems: { fontSize: 14, color: '#1A1640', marginBottom: 10 },
  orderCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderTotal: { fontSize: 17, fontWeight: '800', color: '#D02010', flex: 1 },
  orderDate: { fontSize: 12, color: '#6B6490' },
  orderType: { fontSize: 18 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#201060', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#6B6490', textAlign: 'center', marginBottom: 24 },
  orderNowBtn: { backgroundColor: '#D02010', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  orderNowBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});

