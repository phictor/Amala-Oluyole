import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated,
  ScrollView, Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { trpc } from '@/lib/trpc';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

export function AdminMenu() {
  const [open, setOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const { data: activeOrders = [] } = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10_000 });
  const pendingCount = (activeOrders as any[]).filter((o) => o.status === 'pending' || o.status === 'accepted').length;
  const kitchenCount = (activeOrders as any[]).filter((o) => ['pending', 'accepted', 'preparing'].includes(o.status)).length;

  const items: MenuItem[] = [
    { label: 'Finance', icon: '💳', route: '/(portal-admin)/' },
    { label: 'Orders', icon: '📋', route: '/(portal-admin)/orders', badge: pendingCount },
    { label: 'Kitchen', icon: '🍽️', route: '/(portal-admin)/kitchen', badge: kitchenCount },
    { label: 'Riders', icon: '🛵', route: '/(portal-admin)/riders' },
    { label: 'Menu', icon: '🛍️', route: '/(portal-admin)/meals' },
    { label: 'Staff', icon: '👥', route: '/(portal-admin)/staff' },
    { label: 'Settings', icon: '⚙️', route: '/(portal-admin)/settings' },
  ];

  const openMenu = () => {
    setOpen(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setOpen(false));
  };

  const navigate = (route: string) => {
    closeMenu();
    setTimeout(() => router.push(route as any), 250);
  };

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  const isActive = (route: string) => {
    if (route === '/(portal-admin)/') return pathname === '/(portal-admin)' || pathname === '/(portal-admin)/index';
    return pathname.includes(route.replace('/(portal-admin)/', ''));
  };

  return (
    <>
      {/* Hamburger trigger button */}
      <TouchableOpacity style={[s.trigger, { bottom: insets.bottom + 16 }]} onPress={openMenu} activeOpacity={0.85}>
        <Text style={s.triggerIcon}>☰</Text>
        {(pendingCount + kitchenCount) > 0 && (
          <View style={s.triggerBadge}>
            <Text style={s.triggerBadgeText}>{Math.min(pendingCount + kitchenCount, 99)}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Slide-up menu overlay */}
      <Modal visible={open} transparent animationType="none" onRequestClose={closeMenu}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeMenu} />
        <Animated.View style={[s.sheet, { transform: [{ translateY }], paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Admin Menu</Text>
            <TouchableOpacity onPress={closeMenu} style={s.closeBtn} activeOpacity={0.7}>
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Menu items */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const active = isActive(item.route);
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[s.menuItem, active && s.menuItemActive]}
                  onPress={() => navigate(item.route)}
                  activeOpacity={0.75}
                >
                  <Text style={s.menuIcon}>{item.icon}</Text>
                  <Text style={[s.menuLabel, active && s.menuLabelActive]}>{item.label}</Text>
                  {!!item.badge && item.badge > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                    </View>
                  )}
                  {active && <View style={s.activeIndicator} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#1A3C5E',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 8,
    zIndex: 100,
  },
  triggerIcon: { fontSize: 22, color: '#FFF' },
  triggerBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#D02010', borderRadius: 9,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  triggerBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8, paddingHorizontal: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  closeBtn: { padding: 8 },
  closeIcon: { fontSize: 18, color: '#6B7280' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
    position: 'relative',
  },
  menuItemActive: { backgroundColor: '#F0F4F8' },
  menuIcon: { fontSize: 22, width: 36 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: '#374151' },
  menuLabelActive: { color: '#1A3C5E', fontWeight: '800' },
  badge: {
    backgroundColor: '#D02010', borderRadius: 12,
    minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  activeIndicator: {
    position: 'absolute', left: 0, top: 12, bottom: 12,
    width: 4, borderRadius: 2, backgroundColor: '#1A3C5E',
  },
});
