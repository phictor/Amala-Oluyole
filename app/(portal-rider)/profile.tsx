import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/hooks/use-auth';

export default function RiderProfileScreen() {
  const { user, logout } = useAuth();
  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Text style={s.title}>My Profile</Text>
      </View>
      <View style={s.body}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(user?.name ?? 'R')[0].toUpperCase()}</Text>
        </View>
        <Text style={s.name}>{user?.name ?? 'Rider'}</Text>
        <Text style={s.email}>{user?.email ?? '—'}</Text>
        <View style={s.roleBadge}>
          <Text style={s.roleText}>🚴 Rider</Text>
        </View>
      </View>
      <TouchableOpacity style={s.logoutBtn} onPress={logout} activeOpacity={0.85}>
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 22, fontWeight: '900', color: '#111827' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#059669' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280' },
  roleBadge: { backgroundColor: '#DCFCE7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginTop: 8 },
  roleText: { fontSize: 14, fontWeight: '700', color: '#166534' },
  logoutBtn: { margin: 24, backgroundColor: '#FEE2E2', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '800', color: '#991B1B' },
});
