import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { BRANCHES } from '@/lib/data/mock-data';
import type { Branch } from '@/lib/data/types';

export default function BranchSelectScreen() {
  const { dispatch } = useAppStore();
  const [search, setSearch] = useState('');

  const filtered = BRANCHES.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (branch: Branch) => {
    dispatch({ type: 'SET_BRANCH', payload: branch });
    router.replace('/(tabs)' as never);
  };

  const renderBranch = ({ item }: { item: Branch }) => (
    <TouchableOpacity
      style={[styles.card, !item.isOpen && styles.cardClosed]}
      onPress={() => item.isOpen && handleSelect(item)}
      disabled={!item.isOpen}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.branchName}>{item.name}</Text>
          <Text style={styles.branchAddress}>{item.address}</Text>
          {item.distanceKm && (
            <Text style={styles.distance}>📍 {item.distanceKm} km away</Text>
          )}
        </View>
        <View style={[styles.statusBadge, item.isOpen ? styles.statusOpen : styles.statusClosed]}>
          <Text style={styles.statusText}>{item.isOpen ? 'Open' : 'Closed'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.hoursRow}>
          <Text style={styles.hoursText}>🕐 {item.openingTime} – {item.closingTime}</Text>
        </View>
        <View style={styles.servicesRow}>
          {item.supportsDelivery && <View style={styles.serviceTag}><Text style={styles.serviceTagText}>🛵 Delivery</Text></View>}
          {item.supportsPickup && <View style={styles.serviceTag}><Text style={styles.serviceTagText}>🥡 Pickup</Text></View>}
          {item.supportsDineIn && <View style={styles.serviceTag}><Text style={styles.serviceTagText}>🍽️ Dine-in</Text></View>}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Branch</Text>
        <Text style={styles.subtitle}>Select your nearest Amala Oluyole branch to see available meals.</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search branches..."
          placeholderTextColor="#A08070"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderBranch}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A0F0A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8B6F5E', lineHeight: 22, marginBottom: 16 },
  searchInput: {
    backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#1A0F0A',
  },
  list: { paddingHorizontal: 24, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1.5, borderColor: '#E8D5C4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardClosed: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardLeft: { flex: 1, marginRight: 12 },
  branchName: { fontSize: 18, fontWeight: '700', color: '#1A0F0A', marginBottom: 4 },
  branchAddress: { fontSize: 14, color: '#8B6F5E', marginBottom: 4 },
  distance: { fontSize: 13, color: '#C0392B', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusOpen: { backgroundColor: '#D5F5E3' },
  statusClosed: { backgroundColor: '#FDECEA' },
  statusText: { fontSize: 13, fontWeight: '700', color: '#1A0F0A' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F0E4D8', paddingTop: 12 },
  hoursRow: { marginBottom: 8 },
  hoursText: { fontSize: 13, color: '#8B6F5E' },
  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceTag: { backgroundColor: '#FFF5EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  serviceTagText: { fontSize: 12, color: '#6B3A2A', fontWeight: '600' },
});
