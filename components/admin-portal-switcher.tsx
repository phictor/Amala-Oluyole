import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

/**
 * Floating portal-switcher for admin users.
 * Shows a persistent "Admin" pill that opens a portal selector modal.
 * Persists the selected portal in AsyncStorage so the root layout can redirect on next launch.
 */
export function AdminPortalSwitcher() {
  const [open, setOpen] = useState(false);

  const switchTo = async (portal: 'admin' | 'kitchen' | 'rider' | 'customer') => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setOpen(false);
    await AsyncStorage.setItem('admin_preview_customer', portal === 'customer' ? 'true' : 'false');
    const routes: Record<string, string> = {
      admin: '/(portal-admin)',
      kitchen: '/(portal-kitchen)',
      rider: '/(portal-rider)',
      customer: '/(tabs)',
    };
    router.replace(routes[portal] as any);
  };

  return (
    <>
      {/* Floating pill */}
      <TouchableOpacity style={s.pill} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={s.pillText}>⚙️ Admin</Text>
      </TouchableOpacity>

      {/* Portal selector modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Switch Portal</Text>
            <Text style={s.sheetSub}>You are viewing as Admin. Switch to any portal.</Text>
            {[
              { key: 'admin' as const, icon: '📊', label: 'Finance & Operations', color: '#1A3C5E', bg: '#EFF6FF' },
              { key: 'kitchen' as const, icon: '👨‍🍳', label: 'Kitchen Portal', color: '#92400E', bg: '#FFFBEB' },
              { key: 'rider' as const, icon: '🚴', label: 'Rider Portal', color: '#166534', bg: '#DCFCE7' },
              { key: 'customer' as const, icon: '👁️', label: 'Customer View', color: '#374151', bg: '#F3F4F6' },
            ].map(item => (
              <TouchableOpacity key={item.key} style={[s.option, { backgroundColor: item.bg }]} onPress={() => switchTo(item.key)} activeOpacity={0.85}>
                <Text style={s.optionIcon}>{item.icon}</Text>
                <Text style={[s.optionLabel, { color: item.color }]}>{item.label}</Text>
                <Text style={[s.optionArrow, { color: item.color }]}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setOpen(false)} activeOpacity={0.8}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  pill: {
    position: 'absolute', bottom: 90, right: 16, zIndex: 999,
    backgroundColor: '#1A3C5E', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  pillText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 10, gap: 12 },
  optionIcon: { fontSize: 24 },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  optionArrow: { fontSize: 20, fontWeight: '700' },
  cancelBtn: { backgroundColor: '#F3F4F6', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 15, fontWeight: '700', color: '#374151' },
});
