import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { useNewOrderAlert } from '@/hooks/use-new-order-alert';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', accepted: '#0EA5E9', preparing: '#8B5CF6',
  ready: '#22C55E', cancelled: '#EF4444',
};

export default function AdminKitchenScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const ordersQ = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10_000 });
  const utils = trpc.useUtils();
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => utils.admin.activeOrders.invalidate() });

  const orders = ordersQ.data ?? [];
  const pending = orders.filter((o: any) => o.status === 'pending');
  const inProgress = orders.filter((o: any) => ['accepted', 'preparing'].includes(o.status));
  const ready = orders.filter((o: any) => o.status === 'ready');

  // Admin also gets the sound/haptic alert — muted by default for admin view
  useNewOrderAlert(orders, false);

  const onRefresh = async () => { setRefreshing(true); await ordersQ.refetch(); setRefreshing(false); };

  const handleAction = (orderId: number, status: string) => {
    const next: Record<string, { label: string; status: any }> = {
      pending: { label: 'Accept Order', status: 'accepted' },
      accepted: { label: 'Start Preparing', status: 'preparing' },
      preparing: { label: 'Mark Ready', status: 'ready' },
      ready: { label: 'Out for Delivery', status: 'out_for_delivery' },
    };
    const action = next[status];
    if (!action) return;
    Alert.alert('Update Order', action.label + '?', [
      { text: 'Cancel', style: 'cancel' },
      { text: action.label, onPress: () => updateStatus.mutate({ orderId, status: action.status }) },
    ]);
  };

  const renderOrder = (order: any) => (
    <View key={order.id} style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.orderNum}>#{order.orderNumber}</Text>
        <View style={[s.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] ?? '#6B7280') + '25' }]}>
          <Text style={[s.statusText, { color: STATUS_COLOR[order.status] ?? '#6B7280' }]}>{order.status}</Text>
        </View>
      </View>
      <Text style={s.orderMeta}>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : ''} · ₦{Number(order.total).toLocaleString()} · {order.orderType === 'delivery' ? '🚴' : '🏪'}</Text>
      {/* Dish list */}
      {Array.isArray(order.items) && order.items.length > 0 && (
        <View style={s.itemList}>
          {order.items.map((item: any, idx: number) => (
            <View key={idx} style={s.itemRow}>
              <View style={s.itemQtyBadge}><Text style={s.itemQtyText}>{item.quantity}×</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{item.name}</Text>
                {item.specialInstructions ? <Text style={s.itemNote}>📝 {item.specialInstructions}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}
      {['pending', 'accepted', 'preparing', 'ready'].includes(order.status) && (
        <TouchableOpacity style={s.actionBtn} onPress={() => handleAction(order.id, order.status)} activeOpacity={0.8}>
          <Text style={s.actionBtnText}>
            {order.status === 'pending' ? '✅ Accept' : order.status === 'accepted' ? '👨‍🍳 Start Preparing' : order.status === 'preparing' ? '🍽️ Mark Ready' : '🚴 Out for Delivery'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Kitchen View</Text>
        <Text style={s.sub}>{orders.length} active · {pending.length} new</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {pending.length > 0 && (
          <View style={s.group}><Text style={s.groupTitle}>🔔 New Orders ({pending.length})</Text>{pending.map(renderOrder)}</View>
        )}
        {inProgress.length > 0 && (
          <View style={s.group}><Text style={s.groupTitle}>👨‍🍳 In Progress ({inProgress.length})</Text>{inProgress.map(renderOrder)}</View>
        )}
        {ready.length > 0 && (
          <View style={s.group}><Text style={s.groupTitle}>✅ Ready ({ready.length})</Text>{ready.map(renderOrder)}</View>
        )}
        {orders.length === 0 && (
          <View style={s.empty}><Text style={s.emptyIcon}>🍽️</Text><Text style={s.emptyText}>No active orders</Text></View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  group: { marginTop: 16 },
  groupTitle: { fontSize: 15, fontWeight: '800', color: '#374151', marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderNum: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  orderMeta: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  itemList: { backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10, marginBottom: 10, gap: 6, borderWidth: 1, borderColor: '#FDE68A' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemQtyBadge: { backgroundColor: '#D97706', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, minWidth: 28, alignItems: 'center' },
  itemQtyText: { fontSize: 12, fontWeight: '900', color: '#FFF' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  itemNote: { fontSize: 11, color: '#92400E', marginTop: 2, fontStyle: 'italic' },
  actionBtn: { backgroundColor: '#FEF3C7', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#374151' },
});
