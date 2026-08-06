import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';

const ROLE_COLOR: Record<string, string> = {
  admin: '#7C3AED', manager: '#1A3C5E', kitchen: '#D97706', rider: '#059669', customer: '#6B7280',
};
const ROLES = ['customer', 'admin', 'manager', 'kitchen', 'rider'] as const;
const VEHICLE_TYPES: Array<'motorcycle' | 'bicycle' | 'car'> = ['motorcycle', 'bicycle', 'car'];

export default function AdminStaffScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showAddRider, setShowAddRider] = useState(false);
  // Full rider registration form fields
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [riderEmail, setRiderEmail] = useState('');
  const [riderAddress, setRiderAddress] = useState('');
  const [riderBranchId, setRiderBranchId] = useState('1');
  const [riderVehicle, setRiderVehicle] = useState<'motorcycle' | 'bicycle' | 'car'>('motorcycle');
  const [riderPlate, setRiderPlate] = useState('');

  const staffQ = trpc.admin.allStaff.useQuery(undefined, { staleTime: 30_000 });
  const customersQ = trpc.admin.allCustomers.useQuery(undefined, { staleTime: 30_000 });
  const branchesQ = trpc.admin.allBranches.useQuery(undefined, { staleTime: 60_000 });
  const utils = trpc.useUtils();

  const setRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { utils.admin.allStaff.invalidate(); utils.admin.allCustomers.invalidate(); },
  });

  const createRider = trpc.admin.createRider.useMutation({
    onSuccess: (data) => {
      Alert.alert('Rider Added', `${riderName} has been registered as a rider. They can now log in to the Rider portal.`);
      setShowAddRider(false);
      setRiderName(''); setRiderPhone(''); setRiderEmail(''); setRiderAddress(''); setRiderPlate('');
      utils.admin.allStaff.invalidate();
    },
    onError: (err) => Alert.alert('Error', err.message || 'Could not register rider. Please check the details and try again.'),
  });

  const staff = staffQ.data ?? [];
  const customers = customersQ.data?.rows ?? [];
  const totalCustomers = customersQ.data?.total ?? 0;
  const branches = branchesQ.data ?? [];
  const [tab, setTab] = useState<'staff' | 'customers'>('staff');

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([staffQ.refetch(), customersQ.refetch()]);
    setRefreshing(false);
  };

  const handleSetRole = (userId: number, name: string, currentRole: string) => {
    Alert.alert(`Change Role — ${name}`, `Current role: ${currentRole}`, [
      { text: 'Cancel', style: 'cancel' },
      ...ROLES.filter(r => r !== currentRole).map(r => ({
        text: r.charAt(0).toUpperCase() + r.slice(1),
        onPress: () => setRole.mutate({ userId, role: r }),
      })),
    ]);
  };

  const handleSubmitRider = () => {
    if (!riderName.trim()) { Alert.alert('Missing', 'Please enter the rider\'s full name.'); return; }
    if (!riderPhone.trim()) { Alert.alert('Missing', 'Please enter the rider\'s phone number.'); return; }
    if (!riderAddress.trim()) { Alert.alert('Missing', 'Please enter the rider\'s home address.'); return; }
    createRider.mutate({
      name: riderName.trim(),
      phone: riderPhone.trim(),
      email: riderEmail.trim() || undefined,
      homeAddress: riderAddress.trim(),
      branchId: Number(riderBranchId),
      vehicleType: riderVehicle,
      vehiclePlate: riderPlate.trim() || undefined,
    });
  };

  return (
    <>
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View>
          <Text style={s.title}>People</Text>
          <Text style={s.sub}>{staff.length} staff · {totalCustomers} customers</Text>
        </View>
        <TouchableOpacity style={s.addRiderBtn} onPress={() => setShowAddRider(true)} activeOpacity={0.8}>
          <Text style={s.addRiderBtnText}>+ Add Rider</Text>
        </TouchableOpacity>
      </View>
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tabBtn, tab === 'staff' && s.tabBtnActive]} onPress={() => setTab('staff')} activeOpacity={0.8}>
          <Text style={[s.tabBtnText, tab === 'staff' && s.tabBtnTextActive]}>Staff ({staff.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'customers' && s.tabBtnActive]} onPress={() => setTab('customers')} activeOpacity={0.8}>
          <Text style={[s.tabBtnText, tab === 'customers' && s.tabBtnTextActive]}>Customers ({totalCustomers})</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'staff' ? (
          staff.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No staff accounts yet</Text></View>
          ) : (
            staff.map((person: any) => (
              <View key={person.id} style={s.card}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{(person.name ?? 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{person.name}</Text>
                  <Text style={s.email}>{person.email ?? person.phone ?? '—'}</Text>
                  <Text style={s.joined}>Joined {person.createdAt ? new Date(person.createdAt).toLocaleDateString('en-NG') : '—'}</Text>
                </View>
                <TouchableOpacity
                  style={[s.roleBadge, { backgroundColor: (ROLE_COLOR[person.role] ?? '#6B7280') + '20' }]}
                  onPress={() => handleSetRole(person.id, person.name, person.role)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.roleText, { color: ROLE_COLOR[person.role] ?? '#6B7280' }]}>{person.role}</Text>
                  <Text style={[s.roleEdit, { color: ROLE_COLOR[person.role] ?? '#6B7280' }]}>✎</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : (
          customers.length === 0 ? (
            <View style={s.empty}><Text style={s.emptyText}>No customers yet</Text></View>
          ) : (
            customers.map((c: any) => (
              <View key={c.id} style={s.card}>
                <View style={[s.avatar, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[s.avatarText, { color: '#0369A1' }]}>{(c.name ?? 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{c.name}</Text>
                  <Text style={s.email}>{c.email ?? c.phone ?? '—'}</Text>
                  <Text style={s.joined}>Joined {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-NG') : '—'}</Text>
                </View>
                <TouchableOpacity
                  style={[s.roleBadge, { backgroundColor: '#F3F4F6' }]}
                  onPress={() => handleSetRole(c.id, c.name, 'customer')}
                  activeOpacity={0.8}
                >
                  <Text style={[s.roleText, { color: '#374151' }]}>customer</Text>
                  <Text style={[s.roleEdit, { color: '#374151' }]}>✎</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </ScrollView>
    </ScreenContainer>

    {/* Add Rider Modal */}
    <Modal visible={showAddRider} transparent animationType="slide" onRequestClose={() => setShowAddRider(false)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Register New Rider</Text>
              <TouchableOpacity onPress={() => setShowAddRider(false)} activeOpacity={0.7}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.modalSub}>Fill in the rider's details below. A new account will be created for them.</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={s.fieldGroup}>
                <Text style={s.modalLabel}>Full Name *</Text>
                <TextInput style={s.modalInput} placeholder="e.g. Emeka Okafor" value={riderName} onChangeText={setRiderName} />
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.modalLabel}>Phone Number *</Text>
                <TextInput style={s.modalInput} placeholder="e.g. 08012345678" keyboardType="phone-pad" value={riderPhone} onChangeText={setRiderPhone} />
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.modalLabel}>Email Address (optional)</Text>
                <TextInput style={s.modalInput} placeholder="emeka@example.com" keyboardType="email-address" autoCapitalize="none" value={riderEmail} onChangeText={setRiderEmail} />
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.modalLabel}>Home Address *</Text>
                <TextInput style={[s.modalInput, { height: 72, textAlignVertical: 'top' }]} placeholder="e.g. 12 Oluyole Estate, Ibadan" multiline value={riderAddress} onChangeText={setRiderAddress} />
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.modalLabel}>Branch</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {branches.length === 0 ? (
                      <TextInput style={[s.modalInput, { width: 120 }]} placeholder="Branch ID" keyboardType="number-pad" value={riderBranchId} onChangeText={setRiderBranchId} />
                    ) : (
                      branches.map((b: any) => (
                        <TouchableOpacity key={b.id} style={[s.vehicleBtn, String(b.id) === riderBranchId && s.vehicleBtnActive]} onPress={() => setRiderBranchId(String(b.id))} activeOpacity={0.8}>
                          <Text style={[s.vehicleBtnText, String(b.id) === riderBranchId && s.vehicleBtnTextActive]}>{(b.name ?? '').replace('Amala Oluyole — ', '').replace('Amala Oluyole - ', '')}</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </ScrollView>
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.modalLabel}>Vehicle Type</Text>
                <View style={s.vehicleRow}>
                  {VEHICLE_TYPES.map(v => (
                    <TouchableOpacity key={v} style={[s.vehicleBtn, riderVehicle === v && s.vehicleBtnActive]} onPress={() => setRiderVehicle(v)} activeOpacity={0.8}>
                      <Text style={[s.vehicleBtnText, riderVehicle === v && s.vehicleBtnTextActive]}>
                        {v === 'motorcycle' ? '🛵' : v === 'bicycle' ? '🚲' : '🚗'} {v}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.modalLabel}>Plate Number (optional)</Text>
                <TextInput style={s.modalInput} placeholder="e.g. LAG-123-AB" autoCapitalize="characters" value={riderPlate} onChangeText={setRiderPlate} />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[s.modalSubmitBtn, (!riderName || !riderPhone || !riderAddress || createRider.isPending) && { opacity: 0.5 }]}
              onPress={handleSubmitRider}
              disabled={!riderName || !riderPhone || !riderAddress || createRider.isPending}
              activeOpacity={0.8}
            >
              <Text style={s.modalSubmitText}>{createRider.isPending ? 'Registering…' : 'Register Rider'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addRiderBtn: { backgroundColor: '#059669', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  addRiderBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#1A3C5E' },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  tabBtnTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#7C3AED' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  email: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  joined: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  roleBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', flexDirection: 'row', gap: 4 },
  roleText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  roleEdit: { fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#9CA3AF', fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
  modalClose: { fontSize: 18, color: '#6B7280', padding: 4 },
  modalSub: { fontSize: 13, color: '#6B7280', marginTop: -4 },
  fieldGroup: { marginBottom: 14 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 },
  modalInput: { borderWidth: 1.5, borderColor: '#D1D5DB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827' },
  vehicleRow: { flexDirection: 'row', gap: 8 },
  vehicleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  vehicleBtnActive: { backgroundColor: '#059669' },
  vehicleBtnText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  vehicleBtnTextActive: { color: '#FFF' },
  modalSubmitBtn: { backgroundColor: '#059669', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  modalSubmitText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});
