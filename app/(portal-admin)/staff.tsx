import React, { useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, ScrollView, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { AdminMenu } from '@/components/admin-menu';
import { trpc } from '@/lib/trpc';

const ROLES = ['customer', 'kitchen', 'rider', 'manager', 'admin'];
const VEHICLES = ['motorcycle', 'bicycle', 'car'] as const;

export default function AdminStaffScreen() {
  const { data: staff, refetch, isRefetching } = trpc.admin.allStaff.useQuery();
  const setRole = trpc.admin.setUserRole.useMutation({ onSuccess: () => refetch() });
  const createRider = trpc.admin.createRider.useMutation({
    onSuccess: () => {
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', address: '', vehicleType: 'motorcycle', plateNumber: '', branchId: 1 });
      refetch();
      Alert.alert('Rider account created', 'Ask the rider to sign in with this same email address. Their Rider portal will open automatically.');
    },
    onError: (e) => Alert.alert('Error', e.message),
  });
  const { data: orders } = trpc.admin.activeOrders.useQuery(undefined, { refetchInterval: 10000 });
  const pendingCount = orders?.filter((o: { status: string }) => o.status === 'pending').length ?? 0;
  const kitchenCount = orders?.filter((o: { status: string }) => ['accepted','preparing'].includes(o.status)).length ?? 0;

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ name: string; phone: string; email: string; address: string; vehicleType: typeof VEHICLES[number]; plateNumber: string; branchId: number }>({ name: '', phone: '', email: '', address: '', vehicleType: 'motorcycle', plateNumber: '', branchId: 1 });

  const ROLE_COLORS: Record<string, string> = { admin: '#201060', manager: '#5B2D8E', kitchen: '#D02010', rider: '#1A5C2A', customer: '#6B6490' };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={styles.header}>
        <Text style={styles.title}>Staff</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Text style={styles.addText}>+ Add Rider</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={(staff ?? []) as never[]}
        keyExtractor={(item: { id: number }) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        ListEmptyComponent={<Text style={styles.empty}>No staff accounts yet.</Text>}
        renderItem={({ item }: { item: { id: number; name?: string; email?: string; role: string } }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name ?? 'User'}</Text>
              <Text style={styles.email}>{item.email ?? '—'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[item.role] ?? '#6B6490' }]}
              onPress={() => Alert.alert('Change Role', item.name ?? 'User', ROLES.map(r => ({ text: r, onPress: () => (setRole as { mutate: (input: { userId: number; role: string }) => void }).mutate({ userId: item.id, role: r }) })).concat([{ text: 'Cancel', onPress: () => {} }]))}
            >
              <Text style={styles.roleText}>{item.role}</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Create Rider Modal */}
      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Register New Rider</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'e.g. Tunde Adeyemi' },
                { key: 'phone', label: 'Phone Number *', placeholder: '+2348012345678', keyboardType: 'phone-pad' },
                { key: 'email', label: 'Email *', placeholder: 'rider@email.com', keyboardType: 'email-address' },
                { key: 'address', label: 'Home Address', placeholder: '12 Oluyole Estate, Ibadan' },
                { key: 'plateNumber', label: 'Plate Number', placeholder: 'OY 123 ABC' },
              ].map(f => (
                <View key={f.key}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    value={String((form as Record<string, unknown>)[f.key] ?? '')}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    keyboardType={(f as { keyboardType?: 'phone-pad' | 'email-address' }).keyboardType}
                    autoCapitalize="none"
                  />
                </View>
              ))}
              <Text style={styles.fieldLabel}>Vehicle Type</Text>
              <View style={styles.vehicleRow}>
                {VEHICLES.map(v => (
                  <TouchableOpacity key={v} style={[styles.vehicleBtn, form.vehicleType === v && styles.vehicleBtnActive]} onPress={() => setForm(p => ({ ...p, vehicleType: v }))}>
                    <Text style={[styles.vehicleText, form.vehicleType === v && styles.vehicleTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={() => {
                  if (!form.name || !form.phone || !form.email) { Alert.alert('Required', 'Name, phone number, and email are required.'); return; }
                  createRider.mutate({ name: form.name, phone: form.phone, email: form.email, address: form.address || undefined, vehicleType: form.vehicleType, plateNumber: form.plateNumber || undefined, branchId: form.branchId });
                }}
              >
                <Text style={styles.submitText}>{createRider.isPending ? 'Creating...' : 'Register Rider'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AdminMenu activeSection="staff" pendingOrders={pendingCount} kitchenOrders={kitchenCount} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#201060' },
  addBtn: { backgroundColor: '#1A5C2A', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#6B6490', marginTop: 40, fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  name: { fontSize: 15, fontWeight: '700', color: '#201060' },
  email: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0EFF8' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#201060' },
  closeIcon: { fontSize: 18, color: '#6B6490' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#201060', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E0DEEF', borderRadius: 10, padding: 12, fontSize: 14, color: '#201060', backgroundColor: '#FAFAFA' },
  vehicleRow: { flexDirection: 'row', gap: 8 },
  vehicleBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E0DEEF', alignItems: 'center' },
  vehicleBtnActive: { backgroundColor: '#201060', borderColor: '#201060' },
  vehicleText: { fontSize: 13, color: '#6B6490', fontWeight: '600' },
  vehicleTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#201060', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
