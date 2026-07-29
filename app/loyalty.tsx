import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';

const TIER_BENEFITS = {
  bronze: ['5% discount on orders', 'Birthday bonus points', 'Early access to promotions'],
  silver: ['10% discount on orders', 'Free delivery on orders above ₦5,000', 'Priority customer support'],
  gold: ['15% discount on orders', 'Free delivery on all orders', 'Dedicated account manager', 'Exclusive menu items'],
  platinum: ['20% discount on orders', 'Free delivery always', 'VIP reservations', 'Monthly gift voucher', 'Exclusive events'],
};

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];
const TIER_CONFIG = {
  bronze: { label: 'Bronze', color: '#F0C000', emoji: '🥉', minPoints: 0 },
  silver: { label: 'Silver', color: '#A8A9AD', emoji: '🥈', minPoints: 2000 },
  gold: { label: 'Gold', color: '#F39C12', emoji: '🥇', minPoints: 5000 },
  platinum: { label: 'Platinum', color: '#8E44AD', emoji: '💎', minPoints: 10000 },
};

export default function LoyaltyScreen() {
  const { state } = useAppStore();
  const user = state.user;
  const loyalty = user?.loyaltyAccount;

  if (!user || user.isGuest || !loyalty) {
    return (
      <View style={styles.guestContainer}>
          <Text style={styles.guestEmoji}>⭐</Text>
        <Text style={styles.guestTitle}>Sign in to access Loyalty Rewards</Text>
        <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth/login' as never)}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tier = TIER_CONFIG[loyalty.tier];
  const currentTierIndex = TIER_ORDER.indexOf(loyalty.tier);
  const nextTier = currentTierIndex < TIER_ORDER.length - 1
    ? TIER_CONFIG[TIER_ORDER[currentTierIndex + 1] as keyof typeof TIER_CONFIG]
    : null;
  const benefits = TIER_BENEFITS[loyalty.tier];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <View style={[styles.heroCard, { backgroundColor: tier.color }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroEmoji}>{tier.emoji}</Text>
          <Text style={styles.heroTier}>{tier.label} Member</Text>
          <Text style={styles.heroPoints}>{loyalty.points.toLocaleString()}</Text>
          <Text style={styles.heroPointsLabel}>Loyalty Points</Text>
          {nextTier && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (loyalty.points / (loyalty.points + loyalty.pointsToNextTier)) * 100)}%` as any }
                ]} />
              </View>
              <Text style={styles.progressText}>
                {loyalty.pointsToNextTier.toLocaleString()} pts to {nextTier.emoji} {nextTier.label}
              </Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loyalty.totalEarned.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loyalty.totalRedeemed.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{loyalty.points.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{tier.emoji} Your {tier.label} Benefits</Text>
          {benefits.map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitCheck}>✅</Text>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* How to Earn */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How to Earn Points</Text>
          <View style={styles.earnCard}>
            <View style={styles.earnRow}><Text style={styles.earnIcon}>🛒</Text><Text style={styles.earnText}>₦100 spent = 10 points</Text></View>
            <View style={styles.earnRow}><Text style={styles.earnIcon}>🎂</Text><Text style={styles.earnText}>Birthday bonus: 500 points</Text></View>
            <View style={styles.earnRow}><Text style={styles.earnIcon}>👥</Text><Text style={styles.earnText}>Refer a friend: 200 points</Text></View>
            <View style={styles.earnRow}><Text style={styles.earnIcon}>⭐</Text><Text style={styles.earnText}>Leave a review: 50 points</Text></View>
          </View>
        </View>

        {/* Transaction History */}
        {loyalty.history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points History</Text>
            {loyalty.history.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</Text>
                </View>
                <Text style={[styles.txPoints, tx.type === 'redeemed' ? styles.txNeg : styles.txPos]}>
                  {tx.type === 'redeemed' ? '−' : '+'}{tx.points}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  guestContainer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 40 },
  guestEmoji: { fontSize: 72, marginBottom: 16 },
  guestTitle: { fontSize: 20, fontWeight: '700', color: '#201060', marginBottom: 24, textAlign: 'center' },
  signInBtn: { backgroundColor: '#D02010', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  signInBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  heroCard: { paddingTop: 56, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  backBtn: {
    position: 'absolute', top: 48, left: 20,
    backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  heroTier: { fontSize: 18, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  heroPoints: { fontSize: 48, fontWeight: '900', color: '#FFF' },
  heroPointsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  progressSection: { width: '100%' },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 4, marginBottom: 6 },
  progressFill: { height: 8, backgroundColor: '#FFF', borderRadius: 4 },
  progressText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E8E6F4' },
  statValue: { fontSize: 20, fontWeight: '800', color: '#D02010' },
  statLabel: { fontSize: 11, color: '#6B6490', marginTop: 2, textAlign: 'center' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#201060', marginBottom: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  benefitCheck: { fontSize: 18 },
  benefitText: { fontSize: 15, color: '#201060' },
  earnCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8E6F4', gap: 10 },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  earnIcon: { fontSize: 22 },
  earnText: { fontSize: 15, color: '#201060' },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EEF9' },
  txDesc: { fontSize: 14, color: '#201060' },
  txDate: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  txPoints: { fontSize: 16, fontWeight: '800' },
  txPos: { color: '#27AE60' },
  txNeg: { color: '#E74C3C' },
});

