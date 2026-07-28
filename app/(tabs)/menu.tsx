import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Image, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { MEALS, CATEGORIES } from '@/lib/data/mock-data';
import type { Meal } from '@/lib/data/types';

const LABEL_CONFIG: Record<string, { text: string; bg: string; color: string }> = {
  popular: { text: 'Popular', bg: '#C0392B', color: '#FFF' },
  new: { text: 'New', bg: '#27AE60', color: '#FFF' },
  chefs_choice: { text: "Chef's", bg: '#F39C12', color: '#FFF' },
  best_seller: { text: 'Best', bg: '#6B3A2A', color: '#FFF' },
};

export default function MenuScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const { state, dispatch } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(params.categoryId || 'all');

  const filtered = MEALS.filter(m => {
    const matchesSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleMealPress = (meal: Meal) => {
    router.push({ pathname: '/meal/[id]' as never, params: { id: meal.id } });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals..."
            placeholderTextColor="#A08070"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[styles.categoryChipText, selectedCategory === 'all' && styles.categoryChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={styles.categoryEmoji}>{cat.icon}</Text>
            <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Build Your Meal CTA */}
      <TouchableOpacity
        style={styles.builderCta}
        onPress={() => router.push('/meal/builder' as never)}
      >
        <Text style={styles.builderCtaText}>🍲 Build Your Swallow & Soup</Text>
      </TouchableOpacity>

      {/* Meal List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>No meals found</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.mealCard} onPress={() => handleMealPress(item)}>
            <Image source={{ uri: item.imageUrl }} style={styles.mealImage} />
            <View style={styles.mealInfo}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealName} numberOfLines={1}>{item.name}</Text>
                <TouchableOpacity onPress={() => dispatch({ type: 'TOGGLE_FAVOURITE', payload: item.id })}>
                  <Text style={styles.favIcon}>{state.favouriteMealIds.includes(item.id) ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.mealDesc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.mealFooter}>
                <Text style={styles.mealPrice}>₦{item.price.toLocaleString()}</Text>
                <View style={styles.mealMeta}>
                  <Text style={styles.mealTime}>🕐 {item.preparationTime}m</Text>
                  {item.labels && item.labels[0] && (
                    <View style={[styles.label, { backgroundColor: LABEL_CONFIG[item.labels[0]]?.bg || '#C0392B' }]}>
                      <Text style={styles.labelText}>{LABEL_CONFIG[item.labels[0]]?.text}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#1A0F0A', marginBottom: 12 },
  searchRow: { flexDirection: 'row' },
  searchInput: {
    flex: 1, backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1A0F0A',
  },
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF5EC', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#E8D5C4',
  },
  categoryChipActive: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  categoryEmoji: { fontSize: 16 },
  categoryChipText: { fontSize: 13, fontWeight: '600', color: '#6B3A2A' },
  categoryChipTextActive: { color: '#FFF' },
  builderCta: {
    marginHorizontal: 20, marginBottom: 12, backgroundColor: '#6B3A2A',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: 'center',
  },
  builderCtaText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  mealCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  mealImage: { width: 110, height: 110, backgroundColor: '#F0E4D8' },
  mealInfo: { flex: 1, padding: 12 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mealName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1A0F0A', marginRight: 8 },
  favIcon: { fontSize: 18 },
  mealDesc: { fontSize: 12, color: '#8B6F5E', lineHeight: 18, marginVertical: 4 },
  mealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealPrice: { fontSize: 16, fontWeight: '800', color: '#C0392B' },
  mealMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTime: { fontSize: 12, color: '#8B6F5E' },
  label: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  labelText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#8B6F5E' },
});
