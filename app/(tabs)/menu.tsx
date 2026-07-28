import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useAppStore } from '@/lib/store/app-store';
import { MEALS, CATEGORIES } from '@/lib/data/mock-data';
import type { Meal } from '@/lib/data/types';

export default function MenuScreen() {
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const { state, dispatch } = useAppStore();
  const [search, setSearch] = useState(params.q ?? '');
  const [activeCategory, setActiveCategory] = useState(params.categoryId ?? 'all');

  const allCategories = [
    { id: 'all', name: 'All', icon: '🍽️', description: '', mealCount: MEALS.length },
    ...CATEGORIES,
  ];

  const filtered = useMemo<Meal[]>(() => {
    let list = MEALS;
    if (activeCategory !== 'all') list = list.filter(m => m.categoryId === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.categoryName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, search]);

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <TouchableOpacity
          style={styles.builderBtn}
          onPress={() => router.push('/meal/builder' as never)}
        >
          <Text style={styles.builderBtnText}>🍲 Build</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals..."
            placeholderTextColor="#B09080"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Tabs */}
      <FlatList
        data={allCategories}
        keyExtractor={c => c.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
        style={styles.catScroll}
        renderItem={({ item: cat }) => {
          const active = cat.id === activeCategory;
          return (
            <Pressable
              style={[styles.catTab, active && styles.catTabActive]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={styles.catTabIcon}>{cat.icon}</Text>
              <Text style={[styles.catTabText, active && styles.catTabTextActive]}>
                {cat.name}
              </Text>
            </Pressable>
          );
        }}
      />

      {/* Meal List */}
      <FlatList
        data={filtered}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {filtered.length} {filtered.length === 1 ? 'meal' : 'meals'} found
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>No meals found</Text>
            <Text style={styles.emptyDesc}>Try a different search or category</Text>
          </View>
        }
        renderItem={({ item: meal }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meal.id } } as never)}
          >
            <View style={styles.cardImgWrap}>
              <Image source={{ uri: meal.imageUrl }} style={styles.cardImg} contentFit="cover" />
              {!meal.isAvailable && (
                <View style={styles.unavailableOverlay}>
                  <Text style={styles.unavailableText}>Unavailable</Text>
                </View>
              )}
              {meal.labels && meal.labels.length > 0 && (
                <View style={[
                  styles.labelBadge,
                  meal.labels.includes('best_seller') ? styles.labelGold :
                  meal.labels.includes('chefs_choice') ? styles.labelOrange :
                  styles.labelRed,
                ]}>
                  <Text style={styles.labelText}>
                    {meal.labels.includes('best_seller') ? '🏆 Best Seller' :
                     meal.labels.includes('chefs_choice') ? "👨‍🍳 Chef's" :
                     meal.labels.includes('new') ? '✨ New' : '🔥 Popular'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.cardName} numberOfLines={1}>{meal.name}</Text>
                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => dispatch({ type: 'TOGGLE_FAVOURITE', payload: meal.id })}
                >
                  <Text style={styles.heartIcon}>
                    {state.favouriteMealIds.includes(meal.id) ? '❤️' : '♡'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{meal.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardPrice}>₦{meal.price.toLocaleString()}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardTime}>⏱ {meal.preparationTime}m</Text>
                  {meal.rating && (
                    <View style={styles.ratingRow}>
                      <Text style={styles.ratingStar}>★</Text>
                      <Text style={styles.ratingVal}>{meal.rating}</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, !meal.isAvailable && styles.addBtnDisabled]}
                disabled={!meal.isAvailable}
                onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meal.id } } as never)}
              >
                <LinearGradient
                  colors={meal.isAvailable ? ['#C0392B', '#8B1A10'] : ['#CCC', '#AAA']}
                  style={styles.addBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.addBtnText}>{meal.isAvailable ? 'Add to Cart' : 'Unavailable'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#1A0F0A' },
  builderBtn: {
    backgroundColor: '#FFF5EC', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#C0392B',
  },
  builderBtnText: { fontSize: 13, fontWeight: '700', color: '#C0392B' },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    gap: 10, borderWidth: 1.5, borderColor: '#EDE0D4',
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A0F0A' },
  clearIcon: { fontSize: 15, color: '#8B6F5E', paddingHorizontal: 4 },

  catScroll: { maxHeight: 72 },
  catList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  catTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#FFF',
    borderWidth: 1.5, borderColor: '#EDE0D4',
  },
  catTabActive: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  catTabIcon: { fontSize: 16 },
  catTabText: { fontSize: 13, fontWeight: '600', color: '#8B6F5E' },
  catTabTextActive: { color: '#FFF' },

  resultCount: { fontSize: 13, color: '#8B6F5E', marginBottom: 12 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1A0F0A' },
  emptyDesc: { fontSize: 14, color: '#8B6F5E' },

  card: {
    backgroundColor: '#FFF', borderRadius: 18, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#6B3A2A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09, shadowRadius: 10, elevation: 4,
  },
  cardImgWrap: { height: 170, position: 'relative' },
  cardImg: { width: '100%', height: '100%' },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  unavailableText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  labelBadge: {
    position: 'absolute', top: 10, left: 10,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  labelRed: { backgroundColor: '#C0392B' },
  labelGold: { backgroundColor: '#D4A017' },
  labelOrange: { backgroundColor: '#E67E22' },
  labelText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { flex: 1, fontSize: 17, fontWeight: '800', color: '#1A0F0A' },
  heartBtn: { padding: 4 },
  heartIcon: { fontSize: 18, color: '#C0392B' },
  cardDesc: { fontSize: 13, color: '#8B6F5E', lineHeight: 19, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardPrice: { fontSize: 18, fontWeight: '900', color: '#C0392B' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTime: { fontSize: 13, color: '#8B6F5E' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingStar: { fontSize: 13, color: '#D4A017' },
  ratingVal: { fontSize: 13, fontWeight: '600', color: '#8B6F5E' },

  addBtn: { borderRadius: 12, overflow: 'hidden' },
  addBtnDisabled: { opacity: 0.6 },
  addBtnGrad: { paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
