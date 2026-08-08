import React, { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, Switch, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';

export default function RiderDeliveriesScreen() {
  const router = useRouter();
  
  const setStatus = trpc.rider.setStatus.useMutation();
  const updateOrderStatus = trpc.rider.updateOrderStatus.useMutation();
  const { data: myOrders, refetch, isRefetching } = trpc.rider.myOrders.useQuery(undefined, { refetchInterval: 10000 });

  const [isOnline, setIsOnline] = React.useState(false);

  const NEXT: Record<string, string> = { ready: 'out_for_delivery', out_for_delivery: 'delivered' };
  const LABEL: Record<string, string> = { ready: 'Pick Up', out_for_delivery: 'Mark Delivered' };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Text style={styles.title}>My Deliveries</Text>
        <View style={styles.onlineRow}>
          <Text style={[styles.onlineLabel, { color: isOnline ? '#1A5C2A' : '#999' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch
            value={isOnline}
            onValueChange={(v) => { setIsOnline(v); setStatus.mutate({ isOnline: v }); }}
            trackColor={{ true: '#1A5C2A', false: '#ccc' }}
            thumbColor="#fff"
          />
        </View>
      </View>
      <FlatList
        data={(myOrders ?? []) as never[]}
        keyExtractor={(item: { id: number }) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛵</Text>
            <Text style={styles.emptyText}>{isOnline ? 'No deliveries assigned yet.' : 'Go online to receive deliveries.'}</Text>
          </View>
        }
        renderItem={({ item }: { item: { id: number; orderNumber: string; status: string; total: string; deliveryAddress?: string } }) => (
          <View style={styles.card}>
            <Text style={styles.orderNum}>#{item.orderNumber}</Text>
            <Text style={styles.address}>{item.deliveryAddress ?? 'Address not set'}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.total}>₦{Number(item.total).toLocaleString()}</Text>
              {NEXT[item.status] && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => (updateOrderStatus as { mutate: (input: { orderId: number; status: string }) => void }).mutate({ orderId: item.id, status: NEXT[item.status] })}>
                  <Text style={styles.actionText}>{LABEL[item.status]}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
      <TouchableOpacity style={styles.mapBtn} onPress={() => router.push('/(portal-rider)/map' as never)}>
        <Text style={styles.mapBtnText}>🗺️ Open Map</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#201060' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel: { fontSize: 13, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#6B6490', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  orderNum: { fontSize: 16, fontWeight: '700', color: '#201060', marginBottom: 4 },
  address: { fontSize: 13, color: '#6B6490', marginBottom: 10 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 16, fontWeight: '700', color: '#201060' },
  actionBtn: { backgroundColor: '#201060', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  mapBtn: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#201060', borderRadius: 26, paddingHorizontal: 20, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  mapBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
