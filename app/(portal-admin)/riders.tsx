import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';

export default function AdminRidersScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const ridersQ = trpc.admin.riders.useQuery(undefined, { staleTime: 30_000 });
  const ordersQ = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10_000 });
  const utils = trpc.useUtils();
  const assignRider = trpc.admin.assignRider.useMutation({ onSuccess: () => { utils.admin.activeOrders.invalidate(); utils.admin.riders.invalidate(); } });

  const riders = ridersQ.data ?? [];
  const orders = ordersQ.data ?? [];
  const readyOrders = orders.filter((o: any) => o.status === 'ready' && o.orderType === 'delivery' && !o.riderId);
  const activeDeliveries = orders.filter((o: any) => ['rider_assigned', 'out_for_delivery'].includes(o.status));

  const onRefresh = async () => { setRefreshing(true); await Promise.all([ridersQ.refetch(), ordersQ.refetch()]); setRefreshing(false); };

  const handleAssign = (orderId: number, orderNumber: string) => {
    const onlineRiders = riders.filter((r: any) => r.rider?.isOnline);
    if (!onlineRiders.length) { Alert.alert('No Riders Online', 'There are no riders currently online.'); return; }
    Alert.alert('Assign Rider', `Assign order #${orderNumber} to:`, [
      { text: 'Cancel', style: 'cancel' },
      ...onlineRiders.map((r: any) => ({
        text: r.user?.name ?? `Rider ${r.rider?.id}`,
        onPress: () => assignRider.mutate({ orderId, riderId: r.rider?.id }),
      })),
    ]);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Riders</Text>
        <Text style={s.sub}>{riders.filter((r: any) => r.rider?.isOnline).length} online · {activeDeliveries.length} active deliveries</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Rider Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Rider Status</Text>
          {riders.length === 0 ? (
            <Text style={s.emptyText}>No riders registered yet</Text>
          ) : (
            riders.map((r: any) => (
              <View key={r.id} style={s.riderCard}>
                <View style={[s.onlineDot, { backgroundColor: r.isOnline ? '#22C55E' : '#D1D5DB' }]} />
                <View style={s.riderInfo}>
                  <Text style={s.riderName}>{r.user?.name ?? `Rider ${r.id}`}</Text>
                  <Text style={s.riderPhone}>{r.user?.phone ?? r.user?.email ?? '—'}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: r.isOnline ? '#DCFCE7' : '#F3F4F6' }]}>
                  <Text style={[s.statusText, { color: r.isOnline ? '#166534' : '#6B7280' }]}>{r.isOnline ? 'Online' : 'Offline'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Orders awaiting rider assignment */}
        {readyOrders.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🚴 Awaiting Assignment ({readyOrders.length})</Text>
            {readyOrders.map((order: any) => (
              <View key={order.id} style={s.orderCard}>
                <View style={s.orderLeft}>
                  <Text style={s.orderNum}>#{order.orderNumber}</Text>
                  <Text style={s.orderMeta}>₦{Number(order.total).toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={s.assignBtn} onPress={() => handleAssign(order.id, order.orderNumber)} activeOpacity={0.8}>
                  <Text style={s.assignBtnText}>Assign Rider</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Active deliveries */}
        {activeDeliveries.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>📦 Active Deliveries ({activeDeliveries.length})</Text>
            {activeDeliveries.map((order: any) => (
              <View key={order.id} style={s.orderCard}>
                <View style={s.orderLeft}>
                  <Text style={s.orderNum}>#{order.orderNumber}</Text>
                  <Text style={s.orderMeta}>{order.status?.replace(/_/g, ' ')}</Text>
                </View>
                <Text style={s.orderTotal}>₦{Number(order.total).toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  onlineDot: { width: 12, height: 12, borderRadius: 6 },
  riderInfo: { flex: 1 },
  riderName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  riderPhone: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  orderLeft: {},
  orderNum: { fontSize: 15, fontWeight: '800', color: '#111827' },
  orderMeta: { fontSize: 12, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  orderTotal: { fontSize: 15, fontWeight: '700', color: '#1A3C5E' },
  assignBtn: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  assignBtnText: { fontSize: 13, fontWeight: '700', color: '#1A3C5E' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },
});
