import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { trpc } from '@/lib/trpc';

export default function PromotionsScreen() {
  const { data: promos, isLoading } = trpc.menu.activePromotions.useQuery(undefined, { staleTime: 60_000 });

  const copyCode = (code: string) => {
    Alert.alert('Code Copied!', `Use code "${code}" at checkout to get your discount.`);
  };

  const formatDiscount = (type: string, value: string | number) => {
    const v = typeof value === 'string' ? parseFloat(value) : value;
    if (type === 'percentage') return `${v}% off`;
    if (type === 'fixed') return `₦${v.toLocaleString()} off`;
    if (type === 'free_delivery') return 'Free Delivery';
    return '';
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

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D02010" />
          <Text style={styles.loadingText}>Loading promotions...</Text>
        </View>
      )}

      <FlatList
        data={promos ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎟️</Text>
            <Text style={styles.emptyText}>No active promotions right now</Text>
          </View> : null
        }
        renderItem={({ item }) => (
          <View style={styles.promoCard}>
            <View style={styles.promoHeader}>
              <Text style={styles.promoEmoji}>🎉</Text>
              <View style={styles.promoHeaderText}>
                <Text style={styles.promoTitle}>{item.description || item.code}</Text>
                <Text style={styles.promoDiscount}>{formatDiscount(item.type, item.value)}</Text>
                {item.expiresAt && (
                  <Text style={styles.promoExpiry}>
                    Expires: {new Date(item.expiresAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>
              <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Active</Text></View>
            </View>
            {item.minOrderAmount && (
              <Text style={styles.promoMin}>Min. order: ₦{parseFloat(String(item.minOrderAmount)).toLocaleString()}</Text>
            )}
            {item.code && (
              <TouchableOpacity style={styles.codeRow} onPress={() => copyCode(item.code)}>
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#201060', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B6490' },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 14, color: '#6B6490', marginTop: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  promoCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1.5, borderColor: '#E8E6F4',
  },
  promoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  promoEmoji: { fontSize: 32 },
  promoHeaderText: { flex: 1 },
  promoTitle: { fontSize: 16, fontWeight: '700', color: '#201060', marginBottom: 2 },
  promoDiscount: { fontSize: 14, fontWeight: '700', color: '#D02010', marginBottom: 2 },
  promoExpiry: { fontSize: 12, color: '#6B6490' },
  activeBadge: { backgroundColor: '#D5F5E3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  activeBadgeText: { fontSize: 12, fontWeight: '700', color: '#27AE60' },
  promoMin: { fontSize: 13, color: '#6B6490', marginBottom: 10 },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F4F3FB', borderRadius: 10, padding: 12 },
  codeLabel: { fontSize: 13, color: '#6B6490' },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeText: { fontSize: 16, fontWeight: '800', color: '#D02010', letterSpacing: 1 },
  copyIcon: { fontSize: 16 },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B6490' },
});
