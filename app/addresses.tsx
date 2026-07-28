import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';

export default function AddressesScreen() {
  const { state } = useAppStore();
  const addresses = state.user?.addresses || [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Saved Addresses</Text>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySubtitle}>Add an address for faster checkout</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.addressCard}>
            <View style={styles.addressLeft}>
              <View style={styles.addressIconBox}>
                <Text style={styles.addressIcon}>{item.label === 'Home' ? '🏠' : item.label === 'Work' ? '🏢' : '📍'}</Text>
              </View>
              <View style={styles.addressInfo}>
                <Text style={styles.addressLabel}>{item.label}</Text>
                <Text style={styles.addressStreet}>{item.street}</Text>
                {item.landmark && <Text style={styles.addressLandmark}>Near {item.landmark}</Text>}
              </View>
            </View>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
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
  title: { fontSize: 26, fontWeight: '800', color: '#1A0F0A' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  addressCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8D5C4',
  },
  addressLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  addressIconBox: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF5EC',
    alignItems: 'center', justifyContent: 'center',
  },
  addressIcon: { fontSize: 22 },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 15, fontWeight: '700', color: '#1A0F0A', marginBottom: 2 },
  addressStreet: { fontSize: 13, color: '#8B6F5E' },
  addressLandmark: { fontSize: 12, color: '#A08070', marginTop: 2 },
  defaultBadge: { backgroundColor: '#D5F5E3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  defaultBadgeText: { fontSize: 12, fontWeight: '700', color: '#27AE60' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A0F0A', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#8B6F5E', textAlign: 'center' },
});

