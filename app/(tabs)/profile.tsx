import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';
import * as Auth from '@/lib/_core/auth';

const TIER_CONFIG = {
  bronze: { label: 'Bronze', color: '#F0C000', emoji: '🥉' },
  silver: { label: 'Silver', color: '#A8A9AD', emoji: '🥈' },
  gold: { label: 'Gold', color: '#F39C12', emoji: '🥇' },
  platinum: { label: 'Platinum', color: '#8E44AD', emoji: '💎' },
};

function MenuRow({ icon, label, onPress, danger }: {
  icon: string; label: string; onPress: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { state, dispatch } = useAppStore();

  // Live profile from DB — includes real role, name, phone
  const { data: profile, isLoading: profileLoading } = trpc.profile.me.useQuery(
    undefined,
    { enabled: state.isAuthenticated && !state.isGuest, staleTime: 30_000 }
  );
  const { data: loyaltyAccount } = trpc.loyalty.account.useQuery(
    undefined,
    { enabled: state.isAuthenticated && !state.isGuest }
  );

  // Use live profile data, fall back to app-store cache
  const p = profile as { name?: string | null; email?: string | null; phone?: string | null; role?: string } | undefined;
  const displayName = p?.name ?? state.user?.name ?? '';
  const displayEmail = p?.email ?? state.user?.email ?? '';
  const displayPhone = p?.phone ?? state.user?.phone ?? '';
  const liveRole = p?.role ?? state.user?.role ?? 'customer';
  const isStaff = ['admin', 'manager', 'kitchen'].includes(liveRole);

  // Loyalty data from live backend
  const la = loyaltyAccount as { points?: number; tier?: string; pointsToNextTier?: number } | undefined;
  const tier = la?.tier ? (TIER_CONFIG[la.tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.bronze) : TIER_CONFIG.bronze;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: async () => {
          await Auth.removeSessionToken();
          await Auth.clearUserInfo();
          dispatch({ type: 'LOGOUT' });
          router.replace('/auth/login' as never);
        },
      },
    ]);
  };

  if (!state.isAuthenticated || state.isGuest) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestAvatarCircle}><Text style={styles.guestEmoji}>👤</Text></View>
        <Text style={styles.guestTitle}>You're browsing as a guest</Text>
        <Text style={styles.guestSubtitle}>Sign in to access your profile, orders, and loyalty rewards</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login' as never)}>
          <LinearGradient colors={['#201060', '#150B50']} style={styles.signInBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/auth/register' as never)}>
          <Text style={styles.registerBtnText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (profileLoading && !displayName) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#D02010" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.userName}>{displayName || 'Loading...'}</Text>
          {!!displayPhone && <Text style={styles.userPhone}>{displayPhone}</Text>}
          {!!displayEmail && <Text style={styles.userEmail}>{displayEmail}</Text>}
        </View>

        {/* Loyalty Card */}
        {la && (
          <TouchableOpacity
            style={styles.loyaltyCard}
            onPress={() => router.push('/loyalty' as never)}
          >
            <View style={styles.loyaltyTop}>
              <View>
                <Text style={styles.loyaltyTierLabel}>{tier.emoji} {tier.label} Member</Text>
                <Text style={styles.loyaltyPoints}>{(la.points ?? 0).toLocaleString()} points</Text>
              </View>
              <Text style={styles.loyaltyArrow}>›</Text>
            </View>
            <View style={styles.loyaltyBar}>
              <View style={[
                styles.loyaltyBarFill,
                { width: `${Math.min(100, ((la.points ?? 0) / Math.max(1, (la.points ?? 0) + (la.pointsToNextTier ?? 1000))) * 100)}%` as any }
              ]} />
            </View>
            <Text style={styles.loyaltyBarLabel}>
              {(la.pointsToNextTier ?? 0).toLocaleString()} pts to next tier
            </Text>
          </TouchableOpacity>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="📋" label="My Orders" onPress={() => router.push('/(tabs)/orders' as never)} />
            <MenuRow icon="❤️" label="Favourites" onPress={() => router.push('/favourites' as never)} />
            <MenuRow icon="📍" label="Saved Addresses" onPress={() => router.push('/addresses' as never)} />
            <MenuRow icon="🎟️" label="Promotions & Offers" onPress={() => router.push('/promotions' as never)} />
            <MenuRow icon="⭐" label="Loyalty Rewards" onPress={() => router.push('/loyalty' as never)} />
          </View>
        </View>

        {/* Dining Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dining</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="🍽️" label="Make a Reservation" onPress={() => router.push('/reservation' as never)} />
            <MenuRow icon="🎪" label="Catering Request" onPress={() => router.push('/catering' as never)} />
          </View>
        </View>

        {/* Staff Portal — only visible to kitchen/admin/manager */}
        {isStaff && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Staff Tools</Text>
            <View style={styles.menuCard}>
              <MenuRow icon="👨‍🍳" label="Kitchen Portal" onPress={() => router.push('/kitchen' as never)} />
              {['admin', 'manager'].includes(liveRole) && (
                <MenuRow icon="🛠️" label="Admin Dashboard" onPress={() => router.push('/admin' as never)} />
              )}
            </View>
          </View>
        )}

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuCard}>
            <MenuRow icon="💬" label="Help & Support" onPress={() => router.push('/support' as never)} />
            <MenuRow icon="📞" label="Contact Us" onPress={() => router.push('/support' as never)} />
            <MenuRow icon="🔔" label="Notifications" onPress={() => router.push('/notifications' as never)} />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.menuCard}>
            <MenuRow icon="🚪" label="Log Out" onPress={handleLogout} danger />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guestContainer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 40 },
  guestEmoji: { fontSize: 72, marginBottom: 16 },
  guestTitle: { fontSize: 22, fontWeight: '800', color: '#201060', marginBottom: 8, textAlign: 'center' },
  guestSubtitle: { fontSize: 15, color: '#6B6490', textAlign: 'center', marginBottom: 32 },
  guestAvatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F4F3FB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  signInBtn: { overflow: 'hidden', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 12 },
  signInBtnGrad: { paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center' },
  signInBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  registerBtn: { borderWidth: 2, borderColor: '#D02010', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 40 },
  registerBtnText: { color: '#D02010', fontSize: 16, fontWeight: '700' },
  profileHeader: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  avatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#D02010',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#FFF' },
  userName: { fontSize: 22, fontWeight: '800', color: '#201060', marginBottom: 4 },
  userPhone: { fontSize: 15, color: '#6B6490', marginBottom: 2 },
  userEmail: { fontSize: 14, color: '#6B6490' },
  loyaltyCard: {
    marginHorizontal: 20, marginBottom: 8, backgroundColor: '#1A1640',
    borderRadius: 16, padding: 16,
  },
  loyaltyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  loyaltyTierLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  loyaltyPoints: { fontSize: 26, fontWeight: '800', color: '#F39C12' },
  loyaltyArrow: { fontSize: 28, color: 'rgba(255,255,255,0.6)' },
  loyaltyBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 6 },
  loyaltyBarFill: { height: 6, backgroundColor: '#F39C12', borderRadius: 3 },
  loyaltyBarLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  section: { paddingHorizontal: 20, marginTop: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B6490', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E8E6F4',
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5EDE5',
  },
  menuIcon: { fontSize: 20, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: '#201060' },
  menuLabelDanger: { color: '#E74C3C' },
  menuChevron: { fontSize: 20, color: '#D02010' },
});
