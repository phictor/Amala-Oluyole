import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { trpc } from '@/lib/trpc';
import { StatusBar } from 'expo-status-bar';

const ROLE_COLOR: Record<string, string> = {
  admin: '#7C3AED', manager: '#1A3C5E', kitchen: '#D97706', rider: '#059669', customer: '#6B7280',
};
const ROLES = ['customer', 'admin', 'manager', 'kitchen', 'rider'] as const;

export default function AdminStaffScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const staffQ = trpc.admin.allStaff.useQuery(undefined, { staleTime: 30_000 });
  const customersQ = trpc.admin.allCustomers.useQuery(undefined, { staleTime: 30_000 });
  const utils = trpc.useUtils();
  const setRole = trpc.admin.setUserRole.useMutation({
    onSuccess: () => { utils.admin.allStaff.invalidate(); utils.admin.allCustomers.invalidate(); },
  });

  const staff = staffQ.data ?? [];
  const customers = customersQ.data?.rows ?? [];
  const totalCustomers = customersQ.data?.total ?? 0;

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

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>People</Text>
        <Text style={s.sub}>{staff.length} staff · {totalCustomers} customers</Text>
      </View>
      {/* Tab Toggle */}
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
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginTop: 2 },
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
});
