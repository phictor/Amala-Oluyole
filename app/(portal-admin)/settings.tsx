import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch, TextInput } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function AdminSettingsScreen() {
  const { logout } = useAuth();
  const promoQ = trpc.admin.allPromoCodes.useQuery(undefined, { staleTime: 30_000 });
  const utils = trpc.useUtils();
  const togglePromo = trpc.admin.togglePromoCode.useMutation({ onSuccess: () => utils.admin.allPromoCodes.invalidate() });
  const deletePromo = trpc.admin.deletePromoCode.useMutation({ onSuccess: () => utils.admin.allPromoCodes.invalidate() });

  const promos = promoQ.data ?? [];

  const handleDeletePromo = (id: number, code: string) => {
    Alert.alert('Delete Promo Code', `Delete "${code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePromo.mutate({ id }) },
    ]);
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>Settings</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}>

        {/* Quick Links */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Reports & Tools</Text>
          {[
            { label: '📊 Transaction Report', onPress: () => router.push('/admin/transaction-report' as any) },
            { label: '📋 Kitchen Monthly Report', onPress: () => router.push('/kitchen/monthly-report' as any) },
            { label: '🗺️ Rider Tracking Map', onPress: () => router.push('/admin/rider-tracking' as any) },
          ].map((item, i) => (
            <TouchableOpacity key={i} style={s.linkRow} onPress={item.onPress} activeOpacity={0.8}>
              <Text style={s.linkText}>{item.label}</Text>
              <Text style={s.linkArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Promo Codes */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Promo Codes</Text>
          </View>
          {promos.length === 0 ? (
            <Text style={s.emptyText}>No promo codes yet</Text>
          ) : (
            promos.map((promo: any) => (
              <View key={promo.id} style={s.promoCard}>
                <View style={s.promoLeft}>
                  <Text style={s.promoCode}>{promo.code}</Text>
                  <Text style={s.promoDesc}>{promo.type === 'percentage' ? `${promo.value}% off` : promo.type === 'fixed' ? `₦${promo.value} off` : promo.type}</Text>
                  {promo.expiresAt && <Text style={s.promoExpiry}>Expires {new Date(promo.expiresAt).toLocaleDateString('en-NG')}</Text>}
                </View>
                <View style={s.promoRight}>
                  <Switch
                    value={promo.isActive}
                    onValueChange={(v) => togglePromo.mutate({ id: promo.id, isActive: v })}
                    trackColor={{ false: '#E5E7EB', true: '#BBF7D0' }}
                    thumbColor={promo.isActive ? '#22C55E' : '#9CA3AF'}
                  />
                  <TouchableOpacity onPress={() => handleDeletePromo(promo.id, promo.code)} activeOpacity={0.8}>
                    <Text style={s.deleteBtn}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={s.signOutBtn} onPress={logout} activeOpacity={0.85}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  section: { marginTop: 20, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 12 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  linkText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  linkArrow: { fontSize: 18, color: '#9CA3AF' },
  promoCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  promoLeft: { flex: 1 },
  promoCode: { fontSize: 15, fontWeight: '800', color: '#111827' },
  promoDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  promoExpiry: { fontSize: 11, color: '#F59E0B', marginTop: 2 },
  promoRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { fontSize: 20 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },
  signOutBtn: { marginTop: 24, backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  signOutText: { fontSize: 15, fontWeight: '800', color: '#991B1B' },
});

