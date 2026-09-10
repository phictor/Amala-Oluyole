import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, RefreshControl,
  ScrollView, Platform, useWindowDimensions,
} from 'react-native';
import { PortalLayout } from '@/components/portal-layout';
import { trpc } from '@/lib/trpc';
import * as Haptics from 'expo-haptics';

const STATUS_NEXT: Record<string, string> = {
  payment_confirmed: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
};
const STATUS_LABEL: Record<string, string> = {
  payment_confirmed: 'Accept Order',
  accepted: 'Start Preparing',
  preparing: 'Mark Ready',
};
const STATUS_COLOR: Record<string, string> = {
  payment_confirmed: '#F59E0B',
  accepted: '#201060',
  preparing: '#3D2FA0',
  ready: '#22C55E',
};

const GROUPS = [
  { label: 'New Orders', statuses: ['payment_confirmed'], color: '#F59E0B', icon: '🔔' },
  { label: 'In Progress', statuses: ['accepted', 'preparing'], color: '#201060', icon: '🍲' },
  { label: 'Ready', statuses: ['ready'], color: '#22C55E', icon: '✅' },
];

type OrderItem = { mealName: string; quantity: number; specialInstructions?: string };
type Order = {
  id: number;
  orderNumber: string;
  status: string;
  orderType: string;
  createdAt: string;
  items?: OrderItem[];
};

function OrderCard({ order, onAction, isLoading }: {
  order: Order;
  onAction: (id: number, status: string) => void;
  isLoading: boolean;
}) {
  const next = STATUS_NEXT[order.status];
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  return (
    <View style={[styles.orderCard, elapsed > 20 && styles.orderCardLate]}>
      <View style={styles.orderCardHeader}>
        <View>
          <Text style={styles.orderNum}>#{order.orderNumber}</Text>
          <Text style={styles.orderMeta}>{(order.orderType ?? '').replace(/_/g, ' ')} · {elapsed}m ago</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[order.status] ?? '#6B6490' }]}>
          <Text style={styles.statusPillText}>{order.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>
      {/* Dish list */}
      <View style={styles.dishList}>
        {(order.items ?? []).map((item, i) => (
          <View key={i} style={styles.dishRow}>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyText}>{item.quantity}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dishName}>{item.mealName}</Text>
              {item.specialInstructions ? (
                <Text style={styles.dishNote}>📝 {item.specialInstructions}</Text>
              ) : null}
            </View>
          </View>
        ))}
        {(!order.items || order.items.length === 0) && (
          <Text style={styles.noItems}>No items listed</Text>
        )}
      </View>
      {/* Action button */}
      {next && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: STATUS_COLOR[order.status] ?? '#201060' }, isLoading && styles.actionBtnDisabled]}
          onPress={() => onAction(order.id, next)}
          disabled={isLoading}
        >
          <Text style={styles.actionBtnText}>{STATUS_LABEL[order.status]}</Text>
        </TouchableOpacity>
      )}
      {elapsed > 20 && (
        <View style={styles.lateTag}>
          <Text style={styles.lateTagText}>⚠️ Running late</Text>
        </View>
      )}
    </View>
  );
}

export default function KitchenOrdersScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const { data: orders, refetch, isRefetching } = trpc.admin.activeOrders.useQuery(
    { branchId: 1 }, { refetchInterval: 10000 }
  );
  const updateStatus = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => refetch(),
    onError: () => setAlertMsg('Order was not updated. Refresh the board and try again.'),
  });
  const prevCountRef = useRef(0);
  const initialOrdersLoaded = useRef(false);
  const webAudioContext = useRef<any>(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const enableSound = async () => {
    if (Platform.OS !== 'web') return;
    const AudioContextConstructor = (globalThis as unknown as { AudioContext?: new () => any; webkitAudioContext?: new () => any }).AudioContext
      ?? (globalThis as unknown as { webkitAudioContext?: new () => any }).webkitAudioContext;
    if (!AudioContextConstructor) {
      setAlertMsg('Browser sound is not supported here. Keep this page visible for new-order alerts.');
      return;
    }
    const context = webAudioContext.current ?? new AudioContextConstructor();
    webAudioContext.current = context;
    await context.resume?.();
    setSoundEnabled(true);
    setAlertMsg('Kitchen sound alerts are on.');
  };

  const playWebChime = () => {
    const context = webAudioContext.current;
    if (!context || !soundEnabled) return;
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.12, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.45);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.45);
    } catch {
      // Browser alert sound is optional; the visual banner remains available.
    }
  };

  useEffect(() => {
    const pending = orders?.filter((o: { status: string }) => o.status === 'payment_confirmed').length ?? 0;
    if (!initialOrdersLoaded.current && orders) {
      initialOrdersLoaded.current = true;
      prevCountRef.current = pending;
      return;
    }
    if (pending > prevCountRef.current) {
      setAlertMsg('New order received!');
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      else playWebChime();
      setTimeout(() => setAlertMsg(''), 4000);
    }
    prevCountRef.current = pending;
  }, [orders, soundEnabled]);

  const handleAction = (orderId: number, status: string) => {
    updateStatus.mutate({ orderId, status: status as never });
  };

  const pendingCount = orders?.filter((o: { status: string }) => o.status === 'payment_confirmed').length ?? 0;

  return (
    <PortalLayout portal="kitchen" title="Oluyole Kitchen" badges={{ index: pendingCount }}>
      {Platform.OS === 'web' ? (
        <View style={styles.soundBar}>
          <Text style={styles.soundHint}>{soundEnabled ? 'Kitchen sound alerts are on' : 'Turn on sound alerts before service starts'}</Text>
          <TouchableOpacity style={[styles.soundButton, soundEnabled && styles.soundButtonOn]} onPress={enableSound}>
            <Text style={styles.soundButtonText}>{soundEnabled ? 'Sound on' : 'Enable sound'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {alertMsg ? (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>🔔 {alertMsg}</Text>
        </View>
      ) : null}

      {isDesktop ? (
        // Desktop: 3-column split pane
        <View style={styles.desktopGrid}>
          {GROUPS.map(group => {
            const groupOrders = ((orders ?? []) as unknown as Order[]).filter(o => group.statuses.includes(o.status));
            return (
              <View key={group.label} style={styles.desktopColumn}>
                <View style={[styles.columnHeader, { borderTopColor: group.color }]}>
                  <Text style={styles.columnIcon}>{group.icon}</Text>
                  <Text style={styles.columnTitle}>{group.label}</Text>
                  <View style={[styles.columnBadge, { backgroundColor: group.color }]}>
                    <Text style={styles.columnBadgeText}>{groupOrders.length}</Text>
                  </View>
                </View>
                <ScrollView
                  style={styles.columnScroll}
                  showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={group.color} />}
                >
                  {groupOrders.length === 0 ? (
                    <View style={styles.emptyCol}>
                      <Text style={styles.emptyColText}>No orders here</Text>
                    </View>
                  ) : groupOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAction={handleAction}
                      isLoading={updateStatus.isPending}
                    />
                  ))}
                </ScrollView>
              </View>
            );
          })}
        </View>
      ) : (
        // Mobile: vertical list
        <ScrollView
          contentContainerStyle={styles.mobileContent}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
        >
          {GROUPS.map(group => {
            const groupOrders = ((orders ?? []) as unknown as Order[]).filter(o => group.statuses.includes(o.status));
            return (
              <View key={group.label} style={styles.mobileGroup}>
                <View style={[styles.mobileGroupHeader, { borderLeftColor: group.color }]}>
                  <Text style={styles.mobileGroupTitle}>{group.icon} {group.label}</Text>
                  <Text style={styles.mobileGroupCount}>{groupOrders.length}</Text>
                </View>
                {groupOrders.length === 0 ? (
                  <Text style={styles.emptyColText}>Nothing here</Text>
                ) : groupOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAction={handleAction}
                    isLoading={updateStatus.isPending}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </PortalLayout>
  );
}

const styles = StyleSheet.create({
  soundBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F4F3FB', paddingVertical: 9, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E8E4F8' },
  soundHint: { color: '#6B6490', fontSize: 12, fontWeight: '600' },
  soundButton: { borderWidth: 1, borderColor: '#201060', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  soundButtonOn: { backgroundColor: '#201060' },
  soundButtonText: { color: '#201060', fontSize: 12, fontWeight: '800' },
  alertBanner: {
    backgroundColor: '#F0C000', paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
  },
  alertText: { color: '#201060', fontWeight: '700', fontSize: 14 },
  // Desktop 3-column
  desktopGrid: { flex: 1, flexDirection: 'row', gap: 0 },
  desktopColumn: {
    flex: 1, borderRightWidth: 1, borderRightColor: '#E8E4F8',
    flexDirection: 'column',
  },
  columnHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, borderTopWidth: 3, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E8E4F8',
  },
  columnIcon: { fontSize: 18 },
  columnTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#201060' },
  columnBadge: { borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  columnBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  columnScroll: { flex: 1, padding: 12 },
  emptyCol: { alignItems: 'center', paddingVertical: 40 },
  emptyColText: { color: '#9B94C4', fontSize: 13 },
  // Order card
  orderCard: {
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#E8E4F8',
    shadowColor: '#201060', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  orderCardLate: { borderColor: '#D02010', borderWidth: 1.5 },
  orderCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#201060' },
  orderMeta: { fontSize: 12, color: '#9B94C4', marginTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { color: '#FFF', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  dishList: { gap: 6, marginBottom: 12 },
  dishRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  qtyBadge: { backgroundColor: '#201060', borderRadius: 6, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  qtyText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  dishName: { fontSize: 13, color: '#201060', fontWeight: '600' },
  dishNote: { fontSize: 11, color: '#9B94C4', fontStyle: 'italic', marginTop: 2 },
  noItems: { fontSize: 12, color: '#9B94C4', fontStyle: 'italic' },
  actionBtn: { borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  lateTag: { marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 6, padding: 6, alignItems: 'center' },
  lateTagText: { color: '#D02010', fontSize: 11, fontWeight: '600' },
  // Mobile
  mobileContent: { padding: 16, paddingBottom: 80 },
  mobileGroup: { marginBottom: 24 },
  mobileGroupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 10, borderLeftWidth: 3, marginBottom: 10 },
  mobileGroupTitle: { fontSize: 15, fontWeight: '700', color: '#201060' },
  mobileGroupCount: { fontSize: 13, color: '#6B6490', fontWeight: '600' },
});
