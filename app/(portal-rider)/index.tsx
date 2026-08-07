import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Switch, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/use-auth';
import { useNewOrderAlert } from '@/hooks/use-new-order-alert';

const STATUS_COLOR: Record<string, string> = {
  rider_assigned: '#F59E0B', out_for_delivery: '#0EA5E9', delivered: '#22C55E', cancelled: '#EF4444',
};

export default function RiderDeliveriesScreen() {
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const ordersQ = trpc.rider.myOrders.useQuery(undefined, { refetchInterval: 30_000 });
  const utils = trpc.useUtils();
  const setStatus = trpc.rider.setStatus.useMutation();
  const updateOrder = trpc.rider.updateOrderStatus.useMutation({ onSuccess: () => utils.rider.myOrders.invalidate() });

  const orders = ordersQ.data ?? [];

  // Alert when a new order is assigned (rider_assigned status)
  const assignedOrders = orders.map((o: any) => ({ id: o.id, status: o.status === 'rider_assigned' ? 'pending' : o.status }));
  useNewOrderAlert(assignedOrders, false);

  const active = orders.filter((o: any) => !['delivered', 'cancelled'].includes(o.status));
  const completed = orders.filter((o: any) => o.status === 'delivered');

  const onRefresh = async () => { setRefreshing(true); await ordersQ.refetch(); setRefreshing(false); };

  const handleToggleOnline = (val: boolean) => {
    setIsOnline(val);
    setStatus.mutate({ isOnline: val });
  };

  const handleUpdateOrder = (orderId: number, current: string) => {
    const next: Record<string, { label: string; status: any }> = {
      rider_assigned: { label: 'Start Delivery', status: 'out_for_delivery' },
      out_for_delivery: { label: 'Mark Delivered', status: 'delivered' },
    };
    const action = next[current];
    if (!action) return;
    Alert.alert('Update Delivery', action.label + '?', [
      { text: 'Cancel', style: 'cancel' },
      { text: action.label, onPress: () => updateOrder.mutate({ orderId, status: action.status }) },
    ]);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View>
          <Text style={s.title}>Rider Portal</Text>
          <Text style={s.sub}>{user?.name ?? 'Rider'}</Text>
        </View>
        <View style={s.onlineRow}>
          <Text style={[s.onlineLabel, { color: isOnline ? '#059669' : '#9CA3AF' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
            thumbColor={isOnline ? '#059669' : '#9CA3AF'}
          />
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {active.length > 0 && (
          <View style={s.group}>
            <Text style={s.groupTitle}>🚴 Active Deliveries ({active.length})</Text>
            {active.map((order: any) => (
              <View key={order.id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.orderNum}>#{order.orderNumber}</Text>
                  <View style={[s.statusBadge, { backgroundColor: (STATUS_COLOR[order.status] ?? '#6B7280') + '25' }]}>
                    <Text style={[s.statusText, { color: STATUS_COLOR[order.status] ?? '#6B7280' }]}>{order.status?.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
                <Text style={s.orderTotal}>₦{Number(order.total).toLocaleString()}</Text>
                {['rider_assigned', 'out_for_delivery'].includes(order.status) && (
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleUpdateOrder(order.id, order.status)} activeOpacity={0.8}>
                    <Text style={s.actionBtnText}>
                      {order.status === 'rider_assigned' ? '🚴 Start Delivery' : '✅ Mark Delivered'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
        {active.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🛵</Text>
            <Text style={s.emptyText}>{isOnline ? 'Waiting for orders...' : 'Go online to receive orders'}</Text>
          </View>
        )}
        {completed.length > 0 && (
          <View style={s.group}>
            <Text style={s.groupTitle}>✅ Completed Today ({completed.length})</Text>
            {completed.slice(0, 5).map((order: any) => (
              <View key={order.id} style={[s.card, { opacity: 0.7 }]}>
                <Text style={s.orderNum}>#{order.orderNumber}</Text>
                <Text style={s.orderTotal}>₦{Number(order.total).toLocaleString()} · Delivered</Text>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel: { fontSize: 13, fontWeight: '700' },
  group: { marginTop: 16 },
  groupTitle: { fontSize: 15, fontWeight: '800', color: '#374151', marginBottom: 10 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNum: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderTotal: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  actionBtn: { backgroundColor: '#DCFCE7', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#166534' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  logoutBtn: { marginTop: 24, backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#991B1B' },
});
