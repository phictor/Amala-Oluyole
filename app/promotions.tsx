import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PROMOTIONS } from '@/lib/data/mock-data';

export default function PromotionsScreen() {
  const copyCode = (code: string) => {
    Alert.alert('Code Copied!', `Use code "${code}" at checkout to get your discount.`);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Promotions & Offers</Text>
        <Text style={styles.subtitle}>Exclusive deals just for you</Text>
      </View>

      <FlatList
        data={PROMOTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={styles.emptyText}>No active promotions right now</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.promoCard, !item.isActive && styles.promoCardExpired]}>
            <View style={styles.promoHeader}>
              <Text style={styles.promoEmoji}>🎉</Text>
              <View style={styles.promoHeaderText}>
                <Text style={styles.promoTitle}>{item.title}</Text>
                <Text style={styles.promoExpiry}>
                  Expires: {new Date(item.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              {item.isActive ? (
                <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
              ) : (
                <View style={styles.expiredBadge}><Text style={styles.expiredBadgeText}>Expired</Text></View>
              )}
            </View>
            <Text style={styles.promoDesc}>{item.description}</Text>
            {item.minimumOrder && (
              <Text style={styles.promoMin}>Min. order: ₦{item.minimumOrder.toLocaleString()}</Text>
            )}
            {item.code && item.isActive && (
              <TouchableOpacity style={styles.codeRow} onPress={() => copyCode(item.code!)}>
                <Text style={styles.codeLabel}>Promo Code</Text>
                <View style={styles.codeBox}>
                  <Text style={styles.codeText}>{item.code}</Text>
                  <Text style={styles.copyIcon}>📋</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#C0392B', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A0F0A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8B6F5E' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  promoCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#E8D5C4',
  },
  promoCardExpired: { opacity: 0.6 },
  promoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  promoEmoji: { fontSize: 32 },
  promoHeaderText: { flex: 1 },
  promoTitle: { fontSize: 16, fontWeight: '700', color: '#1A0F0A', marginBottom: 2 },
  promoExpiry: { fontSize: 12, color: '#8B6F5E' },
  activeBadge: { backgroundColor: '#D5F5E3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  activeBadgeText: { fontSize: 12, fontWeight: '700', color: '#27AE60' },
  expiredBadge: { backgroundColor: '#FDECEA', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  expiredBadgeText: { fontSize: 12, fontWeight: '700', color: '#E74C3C' },
  promoDesc: { fontSize: 14, color: '#6B3A2A', lineHeight: 20, marginBottom: 8 },
  promoMin: { fontSize: 13, color: '#8B6F5E', marginBottom: 10 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF5EC', borderRadius: 10, padding: 12 },
  codeLabel: { fontSize: 13, color: '#8B6F5E' },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeText: { fontSize: 16, fontWeight: '800', color: '#C0392B', letterSpacing: 1 },
  copyIcon: { fontSize: 16 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#8B6F5E' },
});

