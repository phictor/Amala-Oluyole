import React from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AdminMenu } from '@/components/admin-menu';
import { trpc } from '@/lib/trpc';

export default function AdminRidersScreen() {
  const { data: riders, refetch, isRefetching } = trpc.admin.riders.useQuery(undefined, { refetchInterval: 15000 });
  const { data: orders, refetch: refetchOrders } = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10000 });
  const assignRider = trpc.admin.assignRider.useMutation({ onSuccess: () => { refetch(); refetchOrders(); } });

  const readyOrders = (orders ?? []).filter((o: { status: string }) => o.status === 'ready');
  const pendingCount = orders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = orders?.filter((o: { status: string }) => ['accepted','preparing'].includes(o.status)).length ?? 0;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Text style={styles.title}>Riders</Text>
        <Text style={styles.sub}>{riders?.filter((r: { rider: { isOnline: boolean } }) => r.rider.isOnline).length ?? 0} online</Text>
      </View>
      {readyOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Awaiting Rider ({readyOrders.length})</Text>
          {readyOrders.map((order: { id: number; orderNumber: string; total: string }) => (
            <View key={order.id} style={styles.orderCard}>
              <Text style={styles.orderNum}>#{order.orderNumber} · ₦{Number(order.total).toLocaleString()}</Text>
              <View style={styles.riderBtns}>
                {((riders ?? []) as never[]).filter((r: { rider: { isOnline: boolean } }) => r.rider.isOnline).map((r: { rider: { id: number; userId: number; isOnline: boolean }; user: { id: number; name: string } | null }) => (
                  <TouchableOpacity
                    key={r.rider.id}
                    style={styles.assignBtn}
                    onPress={() => assignRider.mutate({ orderId: order.id, riderId: r.rider.userId } as never)}
                  >
                    <Text style={styles.assignText}>Assign {r.user?.name ?? 'Rider'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      <FlatList
        data={(riders ?? []) as never[]}
        keyExtractor={(_item, index) => String(index)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>No riders registered yet.</Text>}
        renderItem={({ item }: { item: { rider: { id: number; userId: number; isOnline: boolean; vehicleType: string; vehiclePlate: string | null; isAvailable: boolean; branchId: number; currentLatitude: number | null; currentLongitude: number | null; createdAt: Date; updatedAt: Date }; user: { id: number; name: string; phone?: string; email?: string } | null } }) => (
          <View style={styles.riderCard}>
            <View style={[styles.dot, { backgroundColor: item.rider.isOnline ? '#1A5C2A' : '#999' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.riderName}>{item.user?.name ?? 'Rider'}</Text>
              <Text style={styles.riderSub}>{item.rider.vehicleType ?? 'Motorcycle'} · {item.rider.vehiclePlate ?? '—'}</Text>
            </View>
            <Text style={[styles.status, { color: item.rider.isOnline ? '#1A5C2A' : '#999' }]}>
              {item.rider.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        )}
      />
      <AdminMenu activeSection="riders" pendingOrders={pendingCount} kitchenOrders={kitchenCount} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#201060' },
  sub: { fontSize: 14, color: '#6B6490', marginTop: 2 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#D02010', marginBottom: 8 },
  orderCard: { backgroundColor: '#FFF5F5', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#FFCCCC' },
  orderNum: { fontSize: 14, fontWeight: '700', color: '#201060', marginBottom: 8 },
  riderBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  assignBtn: { backgroundColor: '#201060', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  assignText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#6B6490', marginTop: 40, fontSize: 15 },
  riderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  riderName: { fontSize: 15, fontWeight: '700', color: '#201060' },
  riderSub: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  status: { fontSize: 13, fontWeight: '700' },
});
