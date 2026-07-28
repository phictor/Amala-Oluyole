import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import type { Notification } from '@/lib/data/types';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  order: { icon: '📦', color: '#C0392B' },
  payment: { icon: '💳', color: '#27AE60' },
  promotion: { icon: '🎉', color: '#F39C12' },
  loyalty: { icon: '⭐', color: '#8E44AD' },
  reservation: { icon: '🍽️', color: '#2980B9' },
  system: { icon: '🔔', color: '#8B6F5E' },
};

function NotifCard({ notif, onPress }: { notif: Notification; onPress: () => void }) {
  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
  return (
    <TouchableOpacity
      style={[styles.notifCard, !notif.isRead && styles.notifCardUnread]}
      onPress={onPress}
    >
      <View style={[styles.notifIcon, { backgroundColor: config.color + '20' }]}>
        <Text style={styles.notifIconText}>{config.icon}</Text>
      </View>
      <View style={styles.notifContent}>
        <Text style={styles.notifTitle}>{notif.title}</Text>
        <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
        <Text style={styles.notifTime}>
          {new Date(notif.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {!notif.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { state, dispatch } = useAppStore();
  const notifications = state.notifications;

  const handleNotifPress = (notif: Notification) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notif.id });
    if (notif.orderId) {
      router.push({ pathname: '/order/[id]' as never, params: { id: notif.orderId } });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {state.unreadNotificationCount > 0 && (
          <TouchableOpacity onPress={() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' })}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <NotifCard notif={item} onPress={() => handleNotifPress(item)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#C0392B', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A0F0A', marginBottom: 4 },
  markAllText: { fontSize: 14, color: '#C0392B', fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  notifCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, padding: 14,
    marginBottom: 10, alignItems: 'flex-start', gap: 12,
    borderWidth: 1, borderColor: '#E8D5C4',
  },
  notifCardUnread: { borderColor: '#C0392B', backgroundColor: '#FFF9F7' },
  notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifIconText: { fontSize: 20 },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 15, fontWeight: '700', color: '#1A0F0A', marginBottom: 4 },
  notifMessage: { fontSize: 13, color: '#8B6F5E', lineHeight: 18, marginBottom: 6 },
  notifTime: { fontSize: 12, color: '#A08070' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#C0392B', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#8B6F5E' },
});

