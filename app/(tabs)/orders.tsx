import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

const ACTIVE = ['created','awaiting_payment','payment_confirmed','accepted','preparing','ready','rider_assigned','out_for_delivery'];
const STATUS_LABEL: Record<string,string> = { created:'Created', awaiting_payment:'Awaiting Payment', payment_confirmed:'Confirmed', accepted:'Accepted', preparing:'Preparing', ready:'Ready', rider_assigned:'Rider Assigned', out_for_delivery:'On the Way', delivered:'Delivered', completed:'Completed', cancelled:'Cancelled', rejected:'Rejected', refunded:'Refunded' };
const STATUS_COLOR: Record<string,string> = { created:'#9BA1A6', awaiting_payment:'#F59E0B', payment_confirmed:'#22C55E', accepted:'#22C55E', preparing:'#D02010', ready:'#0a7ea4', rider_assigned:'#0a7ea4', out_for_delivery:'#0a7ea4', delivered:'#22C55E', completed:'#22C55E', cancelled:'#EF4444', rejected:'#EF4444', refunded:'#9BA1A6' };

function OrderCard({ order }: { order: any }) {
  const color = STATUS_COLOR[order.status] ?? '#9BA1A6';
  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/order/[id]' as never, params: { id: String(order.id) } })}>
      <View style={styles.cardTop}>
        <Text style={styles.orderNum}>#{order.orderNumber}</Text>
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.badgeText, { color }]}>{STATUS_LABEL[order.status] ?? order.status}</Text>
        </View>
      </View>
      <Text style={styles.orderSub}>{order.orderType === 'delivery' ? '🛵 Delivery' : '🥡 Pickup'}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.total}>₦{Number(order.total).toLocaleString()}</Text>
        <Text style={styles.date}>{new Date(order.createdAt).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const { state } = useAppStore();
  const [tab, setTab] = useState<'active'|'past'>('active');
  const { data: orders = [], isLoading, refetch, isRefetching } = trpc.orders.list.useQuery({ limit: 50 }, { enabled: state.isAuthenticated && !state.isGuest, refetchInterval: 30_000 });
  const active = orders.filter((o: any) => ACTIVE.includes(o.status));
  const past = orders.filter((o: any) => !ACTIVE.includes(o.status));
  const display = tab === 'active' ? active : past;

  if (!state.isAuthenticated || state.isGuest) {
    return (
      <View style={styles.guest}>
        <Text style={styles.guestEmoji}>📋</Text>
        <Text style={styles.guestTitle}>Sign in to view your orders</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login' as never)}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#201060','#150B50']} style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
      </LinearGradient>
      <View style={styles.tabs}>
        {(['active','past'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab===t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab===t && styles.tabTextActive]}>{t==='active' ? `Active${active.length>0?` (${active.length})`:''}` : 'Past Orders'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? <View style={styles.center}><ActivityIndicator size="large" color="#D02010" /></View> : (
        <FlatList
          data={display}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#D02010" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>{tab==='active'?'🍽️':'📋'}</Text>
              <Text style={styles.emptyTitle}>{tab==='active'?'No active orders':'No past orders'}</Text>
              {tab==='active' && <TouchableOpacity style={styles.orderBtn} onPress={() => router.push('/(tabs)/menu' as never)}><Text style={styles.orderBtnText}>Order Now</Text></TouchableOpacity>}
            </View>
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFF' },
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8E6F4' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#D02010' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#9BA1A6' },
  tabTextActive: { color: '#D02010' },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E8E6F4' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#201060' },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  orderSub: { fontSize: 13, color: '#6B6490', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 16, fontWeight: '800', color: '#201060' },
  date: { fontSize: 12, color: '#9BA1A6' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyEmoji: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#201060' },
  orderBtn: { backgroundColor: '#D02010', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  orderBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  guest: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  guestEmoji: { fontSize: 56 },
  guestTitle: { fontSize: 18, fontWeight: '700', color: '#201060', textAlign: 'center' },
  signInBtn: { backgroundColor: '#D02010', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  signInBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
