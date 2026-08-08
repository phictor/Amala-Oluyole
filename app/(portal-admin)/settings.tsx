import React, { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, TextInput, Modal, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AdminMenu } from '@/components/admin-menu';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';
import { useAppStore } from '@/lib/store/app-store';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { dispatch } = useAppStore();
  const { data: promos, refetch, isRefetching } = trpc.admin.allPromoCodes.useQuery();
  const togglePromo = trpc.admin.togglePromoCode.useMutation({ onSuccess: () => refetch() });
  const deletePromo = trpc.admin.deletePromoCode.useMutation({ onSuccess: () => refetch() });
  const { data: orders } = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10000 });
  const pendingCount = orders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = orders?.filter((o: { status: string }) => ['accepted','preparing'].includes(o.status)).length ?? 0;

  const handlePreviewCustomer = () => {
    dispatch({ type: 'SET_PREVIEW_MODE', payload: true } as never);
    router.replace('/(tabs)/' as never);
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Quick links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reports</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/admin/transaction-report' as never)}>
            <Text style={styles.linkText}>📊 Full Transaction Report</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/admin/rider-tracking' as never)}>
            <Text style={styles.linkText}>🗺️ Rider Tracking Map</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Promo codes */}
        <Text style={styles.sectionTitle}>Promo Codes</Text>
        {(promos ?? []).map((p: { id: number; code: string; isActive: boolean; type: string; value: string }) => (
          <View key={p.id} style={styles.promoCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoCode}>{p.code}</Text>
              <Text style={styles.promoSub}>{p.type} · {p.value}</Text>
            </View>
            <TouchableOpacity style={[styles.toggleBtn, { backgroundColor: p.isActive ? '#1A5C2A' : '#999' }]} onPress={() => togglePromo.mutate({ id: p.id, isActive: !p.isActive })}>
              <Text style={styles.toggleText}>{p.isActive ? 'Active' : 'Off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert('Delete', `Remove "${p.code}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deletePromo.mutate({ id: p.id }) }])}>
              <Text style={styles.deleteIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Preview customer app */}
        <View style={[styles.section, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <TouchableOpacity style={styles.previewBtn} onPress={handlePreviewCustomer}>
            <Text style={styles.previewText}>👤 Preview Customer App</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AdminMenu activeSection="settings" pendingOrders={pendingCount} kitchenOrders={kitchenCount} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: '#201060', marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#201060', marginBottom: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  linkText: { flex: 1, fontSize: 15, color: '#201060', fontWeight: '500' },
  arrow: { fontSize: 20, color: '#6B6490' },
  promoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, gap: 8 },
  promoCode: { fontSize: 15, fontWeight: '700', color: '#201060' },
  promoSub: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  toggleBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  deleteIcon: { fontSize: 16, color: '#D02010', padding: 4 },
  previewBtn: { backgroundColor: '#F4F3FB', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E0DEEF' },
  previewText: { fontSize: 15, fontWeight: '700', color: '#201060' },
});
