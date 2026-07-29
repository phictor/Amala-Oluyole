import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';

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
  const user = state.user;
  const loyalty = user?.loyaltyAccount;
  const tier = loyalty?.tier ? TIER_CONFIG[loyalty.tier] : TIER_CONFIG.bronze;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out', style: 'destructive',
        onPress: () => {
          dispatch({ type: 'LOGOUT' });
          router.replace('/auth/login' as never);
        },
      },
    ]);
  };

  if (!user || user.isGuest) {
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
          {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>

        {/* Loyalty Card */}
        {loyalty && (
          <TouchableOpacity
            style={styles.loyaltyCard}
            onPress={() => router.push('/loyalty' as never)}
          >
            <View style={styles.loyaltyTop}>
              <View>
                <Text style={styles.loyaltyTierLabel}>{tier.emoji} {tier.label} Member</Text>
                <Text style={styles.loyaltyPoints}>{loyalty.points.toLocaleString()} points</Text>
              </View>
              <Text style={styles.loyaltyArrow}>›</Text>
            </View>
            <View style={styles.loyaltyBar}>
              <View style={[
                styles.loyaltyBarFill,
                { width: `${Math.min(100, (loyalty.points / (loyalty.points + loyalty.pointsToNextTier)) * 100)}%` as any }
              ]} />
            </View>
            <Text style={styles.loyaltyBarLabel}>
              {loyalty.pointsToNextTier.toLocaleString()} pts to next tier
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

