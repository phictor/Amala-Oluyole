import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { LoadingState } from '@/components/ui';

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', accepted: '#0EA5E9', preparing: '#8B5CF6',
  ready: '#22C55E', out_for_delivery: '#06B6D4', delivered: '#10B981',
  completed: '#059669', cancelled: '#EF4444', rejected: '#DC2626',
};

export default function AdminOrdersScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const ordersQ = trpc.admin.activeOrdersAdmin.useQuery(undefined, { refetchInterval: 10_000 });
  const utils = trpc.useUtils();
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => utils.admin.activeOrdersAdmin.invalidate() });

  const orders = ordersQ.data ?? [];

  const onRefresh = async () => {
    setRefreshing(true);
    await ordersQ.refetch();
    setRefreshing(false);
  };

  const handleUpdate = (orderId: number, current: string) => {
    const transitions: Record<string, { label: string; status: any }[]> = {
      pending: [{ label: 'Accept', status: 'accepted' }, { label: 'Reject', status: 'rejected' }],
      accepted: [{ label: 'Mark Preparing', status: 'preparing' }],
      preparing: [{ label: 'Mark Ready', status: 'ready' }],
      ready: [{ label: 'Out for Delivery', status: 'out_for_delivery' }],
    };
    const options = transitions[current];
    if (!options?.length) return;
    Alert.alert('Update Order Status', 'Choose new status:', [
      { text: 'Cancel', style: 'cancel' },
      ...options.map(o => ({ text: o.label, onPress: () => updateStatus.mutate({ orderId, status: o.status }) })),
    ]);
  };

  if (ordersQ.isLoading) return <LoadingState fullScreen message="Fetching orders..." />;

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Live Orders</Text>
        <Text style={s.sub}>{orders.length} active</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {orders.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📭</Text>
            <Text style={s.emptyText}>No active orders right now</Text>
          </View>
        ) : (
          orders.map((order: any) => (
            <View key={order.id} style={s.card}>
              <View style={s.cardTop}>
                <View>
                  <Text style={s.orderNum}>#{order.orderNumber}</Text>
                  <Text style={s.orderTime}>{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] ?? '#6B7280') + '20' }]}>
                  <Text style={[s.statusText, { color: STATUS_COLOR[order.status] ?? '#6B7280' }]}>{order.status?.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <View style={s.cardMid}>
                <Text style={s.orderType}>{order.orderType === 'delivery' ? '🚴 Delivery' : '🏪 Pickup'}</Text>
                <Text style={s.orderTotal}>₦{Number(order.total).toLocaleString()}</Text>
              </View>
              {Array.isArray(order.items) && order.items.length > 0 && (
                <View style={s.itemList}>
                  {order.items.map((item: any, idx: number) => (
                    <Text key={idx} style={s.itemText}>{item.quantity}× {item.name}</Text>
                  ))}
                </View>
              )}
              <TouchableOpacity style={s.updateBtn} onPress={() => handleUpdate(order.id, order.status)} activeOpacity={0.8}>
                <Text style={s.updateBtnText}>Update Status →</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontSize: 16, fontWeight: '800', color: '#111827' },
  orderTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderType: { fontSize: 13, color: '#374151', fontWeight: '600' },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#1A3C5E' },
  itemList: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, marginBottom: 10, gap: 4 },
  itemText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  updateBtn: { backgroundColor: '#F0F4FF', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  updateBtnText: { fontSize: 13, fontWeight: '700', color: '#1A3C5E' },
});
