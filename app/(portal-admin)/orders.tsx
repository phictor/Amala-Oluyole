import React from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AdminMenu } from '@/components/admin-menu';
import { trpc } from '@/lib/trpc';

const STATUS_COLORS: Record<string, string> = {
  pending: '#F0C000', accepted: '#201060', preparing: '#D02010',
  ready: '#1A5C2A', delivered: '#6B6490', cancelled: '#999',
};

export default function AdminOrdersScreen() {
  const { data: orders, isLoading, refetch, isRefetching } = trpc.admin.activeOrders.useQuery(
    undefined, { refetchInterval: 10000 }
  );
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({ onSuccess: () => refetch() });

  const NEXT: Record<string, string> = {
    pending: 'accepted', accepted: 'preparing', preparing: 'ready', ready: 'delivered',
  };

  const pendingCount = orders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = orders?.filter((o: { status: string }) => ['accepted','preparing'].includes(o.status)).length ?? 0;

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.sub}>{orders?.length ?? 0} active</Text>
      </View>
      {isLoading ? (
        <ActivityIndicator color="#201060" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders ?? []}
          keyExtractor={(item: { id: number }) => String(item.id)}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListEmptyComponent={<Text style={styles.empty}>No active orders right now.</Text>}
          renderItem={({ item }: { item: { id: number; orderNumber: string; status: string; orderType: string; total: string; customerName?: string; items?: { mealName: string; quantity: number }[] } }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.orderNum}>#{item.orderNumber}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#999' }]}>
                  <Text style={styles.badgeText}>{item.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.customer}>{item.customerName ?? 'Customer'} · {item.orderType}</Text>
              {item.items?.map((i: { mealName: string; quantity: number }, idx: number) => (
                <Text key={idx} style={styles.dish}>• {i.quantity}× {i.mealName}</Text>
              ))}
              <View style={styles.cardBottom}>
                <Text style={styles.total}>₦{Number(item.total).toLocaleString()}</Text>
                {NEXT[item.status] && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => updateStatus.mutate({ orderId: item.id, status: NEXT[item.status] as never })}
                  >
                    <Text style={styles.actionText}>→ {NEXT[item.status].replace('_', ' ')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
      <AdminMenu activeSection="orders" pendingOrders={pendingCount} kitchenOrders={kitchenCount} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#201060' },
  sub: { fontSize: 14, color: '#6B6490', marginTop: 2 },
  empty: { textAlign: 'center', color: '#6B6490', marginTop: 40, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNum: { fontSize: 16, fontWeight: '700', color: '#201060' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  customer: { fontSize: 13, color: '#6B6490', marginBottom: 8 },
  dish: { fontSize: 13, color: '#201060', marginBottom: 2 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  total: { fontSize: 16, fontWeight: '700', color: '#201060' },
  actionBtn: { backgroundColor: '#201060', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
