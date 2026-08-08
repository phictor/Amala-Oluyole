import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

interface AdminMenuProps {
  activeSection?: string;
  pendingOrders?: number;
  kitchenOrders?: number;
}

export function AdminMenu({ activeSection, pendingOrders = 0, kitchenOrders = 0 }: AdminMenuProps) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const sections = [
    { key: 'finance', label: 'Finance', icon: '💳', route: '/(portal-admin)/' },
    { key: 'orders', label: 'Orders', icon: '📋', route: '/(portal-admin)/orders', badge: pendingOrders },
    { key: 'kitchen', label: 'Kitchen', icon: '🍽️', route: '/(portal-admin)/kitchen', badge: kitchenOrders },
    { key: 'riders', label: 'Riders', icon: '🛵', route: '/(portal-admin)/riders' },
    { key: 'menu', label: 'Menu', icon: '🛍️', route: '/(portal-admin)/meals' },
    { key: 'staff', label: 'Staff', icon: '👥', route: '/(portal-admin)/staff' },
    { key: 'settings', label: 'Settings', icon: '⚙️', route: '/(portal-admin)/settings' },
  ];

  const totalBadge = (pendingOrders ?? 0) + (kitchenOrders ?? 0);

  const handleOpen = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVisible(true);
  };

  const handleNavigate = (route: string) => {
    setVisible(false);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  };

  return (
    <>
      <TouchableOpacity style={styles.fab} onPress={handleOpen} activeOpacity={0.85}>
        {totalBadge > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{totalBadge > 99 ? '99+' : totalBadge}</Text>
          </View>
        )}
        <Text style={styles.fabIcon}>☰</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Admin Menu</Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          {sections.map((s) => {
            const isActive = activeSection === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleNavigate(s.route)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>{s.icon}</Text>
                <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>{s.label}</Text>
                {s.badge != null && s.badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{s.badge > 99 ? '99+' : s.badge}</Text>
                  </View>
                )}
                {isActive && <View style={styles.activeBar} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#201060',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 100,
  },
  fabIcon: { fontSize: 22, color: '#fff' },
  fabBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#D02010', borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  fabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: 32, paddingTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0EFF8',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#201060' },
  closeBtn: { padding: 4 },
  closeIcon: { fontSize: 18, color: '#6B6490' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 15,
    borderBottomWidth: 1, borderBottomColor: '#F4F3FB', position: 'relative',
  },
  menuItemActive: { backgroundColor: '#F4F3FB' },
  menuIcon: { fontSize: 22, width: 36 },
  menuLabel: { flex: 1, fontSize: 16, color: '#201060', fontWeight: '500' },
  menuLabelActive: { fontWeight: '700', color: '#201060' },
  badge: {
    backgroundColor: '#D02010', borderRadius: 10,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  activeBar: {
    position: 'absolute', left: 0, top: 8, bottom: 8,
    width: 4, backgroundColor: '#201060', borderRadius: 2,
  },
});
