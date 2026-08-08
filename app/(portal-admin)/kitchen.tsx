import React from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AdminMenu } from '@/components/admin-menu';
import { trpc } from '@/lib/trpc';

export default function AdminKitchenScreen() {
  const { data: orders, refetch, isRefetching } = trpc.admin.activeOrders.useQuery(
    undefined, { refetchInterval: 10000 }
  );
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => refetch() });

  const groups = [
    { label: 'New', statuses: ['pending'], color: '#F0C000' },
    { label: 'In Progress', statuses: ['accepted', 'preparing'], color: '#201060' },
    { label: 'Ready', statuses: ['ready'], color: '#1A5C2A' },
  ];

  const pendingCount = orders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = orders?.filter((o: { status: string }) => ['accepted','preparing'].includes(o.status)).length ?? 0;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Text style={styles.title}>Kitchen View</Text>
      </View>
      <FlatList
        data={groups}
        keyExtractor={g => g.label}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        renderItem={({ item: group }) => {
          const groupOrders = (orders ?? []).filter((o: { status: string }) => group.statuses.includes(o.status));
          return (
            <View style={styles.group}>
              <View style={[styles.groupHeader, { borderLeftColor: group.color }]}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <Text style={styles.groupCount}>{groupOrders.length}</Text>
              </View>
              {groupOrders.length === 0 ? (
                <Text style={styles.empty}>Nothing here</Text>
              ) : groupOrders.map((order: { id: number; orderNumber: string; status: string; orderType: string; total: string; items?: { mealName: string; quantity: number; specialInstructions?: string }[] }) => (
                <View key={order.id} style={styles.card}>
                  <Text style={styles.orderNum}>#{order.orderNumber} · {order.orderType}</Text>
                  {order.items?.map((i: { mealName: string; quantity: number; specialInstructions?: string }, idx: number) => (
                    <View key={idx} style={styles.dishRow}>
                      <View style={styles.qtyBadge}><Text style={styles.qtyText}>{i.quantity}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dishName}>{i.mealName}</Text>
                        {i.specialInstructions ? <Text style={styles.note}>{i.specialInstructions}</Text> : null}
                      </View>
                    </View>
                  ))}
                  <View style={styles.actions}>
                    {order.status === 'pending' && (
                      <TouchableOpacity style={[styles.btn, { backgroundColor: '#201060' }]} onPress={() => updateStatus.mutate({ orderId: order.id, status: 'accepted' as never })}>
                        <Text style={styles.btnText}>Accept</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'accepted' && (
                      <TouchableOpacity style={[styles.btn, { backgroundColor: '#D02010' }]} onPress={() => updateStatus.mutate({ orderId: order.id, status: 'preparing' as never })}>
                        <Text style={styles.btnText}>Start Preparing</Text>
                      </TouchableOpacity>
                    )}
                    {order.status === 'preparing' && (
                      <TouchableOpacity style={[styles.btn, { backgroundColor: '#1A5C2A' }]} onPress={() => updateStatus.mutate({ orderId: order.id, status: 'ready' as never })}>
                        <Text style={styles.btnText}>Mark Ready</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          );
        }}
      />
      <AdminMenu activeSection="kitchen" pendingOrders={pendingCount} kitchenOrders={kitchenCount} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#201060' },
  group: { marginBottom: 24 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, paddingLeft: 10, marginBottom: 10 },
  groupLabel: { fontSize: 16, fontWeight: '700', color: '#201060' },
  groupCount: { fontSize: 14, fontWeight: '700', color: '#6B6490' },
  empty: { fontSize: 13, color: '#6B6490', paddingLeft: 14, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  orderNum: { fontSize: 14, fontWeight: '700', color: '#201060', marginBottom: 10 },
  dishRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  qtyBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0C000', alignItems: 'center', justifyContent: 'center', marginRight: 8, marginTop: 1 },
  qtyText: { fontSize: 12, fontWeight: '800', color: '#201060' },
  dishName: { fontSize: 14, color: '#201060', fontWeight: '500' },
  note: { fontSize: 12, color: '#D02010', fontStyle: 'italic', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
