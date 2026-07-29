import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Pressable, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useAppStore } from '@/lib/store/app-store';
import { MEALS, CATEGORIES } from '@/lib/data/mock-data';
import { trpc } from '@/lib/trpc';
import { toMealCard, type MealCard } from '@/lib/utils';

// Category icon mapping for DB categories
const CAT_ICONS: Record<string, string> = {
  'Amala & Swallows': '🍲',
  'Soups & Stews': '🥘',
  'Rice Dishes': '🍚',
  'Grills & BBQ': '🍖',
  'Proteins': '🥩',
  'Drinks': '🥤',
  'Shawarma': '🌯',
  'Desserts': '🍮',
  'Family Packs': '👨‍👩‍👧',
  'Catering': '🎉',
};

export default function MenuScreen() {
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const { state, dispatch } = useAppStore();
  const [search, setSearch] = useState(params.q ?? '');
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(
    params.categoryId ? Number(params.categoryId) : null
  );

  // ── Live data from backend ──────────────────────────────────────────────────
  const { data: liveCategories, isLoading: catsLoading } = trpc.menu.categories.useQuery(
    undefined, { retry: 1, staleTime: 300_000 }
  );
  const { data: liveMeals, isLoading: mealsLoading } = trpc.menu.meals.useQuery(
    {
      categoryId: activeCategoryId ?? undefined,
      search: search.trim() || undefined,
    },
    { retry: 1, staleTime: 30_000 }
  );

  const isLoading = catsLoading || mealsLoading;

  // ── Normalize categories (live DB or mock fallback) ─────────────────────────
  const allCategories = useMemo(() => {
    const base = { id: 0, name: 'All', icon: '🍽️' };
    if (liveCategories && liveCategories.length > 0) {
      return [
        base,
        ...liveCategories.map(c => ({
          id: c.id,
          name: c.name,
          icon: CAT_ICONS[c.name] ?? '🍽️',
        })),
      ];
    }
    return [
      base,
      ...CATEGORIES.map((c, i) => ({ id: -(i + 1), name: c.name, icon: c.icon ?? '🍽️', mockId: c.id })),
    ];
  }, [liveCategories]);

  // ── Normalize meals (live DB or mock fallback with client-side filter) ──────
  const meals: MealCard[] = useMemo(() => {
    if (liveMeals && liveMeals.length > 0) {
      return liveMeals.map(m => toMealCard(m as unknown as Record<string, unknown>));
    }
    // Mock fallback with client-side filtering
    let list = MEALS;
    if (activeCategoryId) list = list.filter(m => Number(m.categoryId) === activeCategoryId);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q)
      );
    }
    return list.map(m => toMealCard(m as unknown as Record<string, unknown>));
  }, [liveMeals, activeCategoryId, search]);

  return (
    <ScreenContainer containerClassName="bg-background" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={styles.headerRight}>
          {isLoading && <ActivityIndicator size="small" color="#D02010" style={{ marginRight: 8 }} />}
          <TouchableOpacity
            style={styles.builderBtn}
            onPress={() => router.push('/meal/builder' as never)}
          >
            <Text style={styles.builderBtnText}>🍲 Build</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals..."
            placeholderTextColor="#9B94C4"
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
        keyExtractor={(c, index) => `cat-${c.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
        style={styles.catScroll}
        renderItem={({ item: cat }) => {
          const active = cat.id === (activeCategoryId ?? 0);
          return (
            <Pressable
              style={[styles.catTab, active && styles.catTabActive]}
              onPress={() => setActiveCategoryId(cat.id === 0 ? null : cat.id)}
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
        data={meals}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {meals.length} {meals.length === 1 ? 'meal' : 'meals'} found
            {liveCategories ? ' · Live' : ' · Offline'}
          </Text>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#D02010" />
              <Text style={styles.emptyDesc}>Loading menu...</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No meals found</Text>
              <Text style={styles.emptyDesc}>Try a different search or category</Text>
            </View>
          )
        }
        renderItem={({ item: meal }) => {
          const isFav = state.favouriteMealIds.includes(String(meal.id));
          const isAvailable = meal.isAvailable !== false;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/meal/[id]', params: { id: String(meal.id) } } as never)}
            >
              <View style={styles.cardImgWrap}>
                <Image
                  source={{ uri: meal.imageUrl ?? undefined }}
                  style={styles.cardImg}
                  contentFit="cover"
                  placeholder={{ uri: 'https://via.placeholder.com/400x200/FDF8F3/C0392B?text=Amala+Oluyole' }}
                />
                {!isAvailable && (
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
                    onPress={() => dispatch({ type: 'TOGGLE_FAVOURITE', payload: String(meal.id) })}
                  >
                    <Text style={styles.heartIcon}>{isFav ? '❤️' : '♡'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{meal.description}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>₦{meal.price.toLocaleString()}</Text>
                  <View style={styles.cardMeta}>
                    {meal.preparationTime ? (
                      <Text style={styles.cardTime}>⏱ {meal.preparationTime}m</Text>
                    ) : null}
                    {meal.rating ? (
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingStar}>★</Text>
                        <Text style={styles.ratingVal}>{meal.rating}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, !isAvailable && styles.addBtnDisabled]}
                  disabled={!isAvailable}
                  onPress={() => router.push({ pathname: '/meal/[id]', params: { id: String(meal.id) } } as never)}
                >
                  <LinearGradient
                    colors={isAvailable ? ['#D02010', '#150B50'] : ['#CCC', '#AAA']}
                    style={styles.addBtnGrad}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.addBtnText}>{isAvailable ? 'Add to Cart' : 'Unavailable'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#201060' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  builderBtn: {
    backgroundColor: '#F4F3FB', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: '#D02010',
  },
  builderBtnText: { fontSize: 13, fontWeight: '700', color: '#D02010' },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    gap: 10, borderWidth: 1.5, borderColor: '#EDEAFB',
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#201060' },
  clearIcon: { fontSize: 15, color: '#6B6490', paddingHorizontal: 4 },

  catScroll: { maxHeight: 72 },
  catList: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  catTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: '#FFF',
    borderWidth: 1.5, borderColor: '#EDEAFB',
  },
  catTabActive: { backgroundColor: '#D02010', borderColor: '#D02010' },
  catTabIcon: { fontSize: 16 },
  catTabText: { fontSize: 13, fontWeight: '600', color: '#6B6490' },
  catTabTextActive: { color: '#FFF' },

  resultCount: { fontSize: 13, color: '#6B6490', marginBottom: 12 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 100 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#201060' },
  emptyDesc: { fontSize: 14, color: '#6B6490' },

  card: {
    backgroundColor: '#FFF', borderRadius: 18, marginBottom: 16, overflow: 'hidden',
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 3 },
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
  labelRed: { backgroundColor: '#D02010' },
  labelGold: { backgroundColor: '#F0C000' },
  labelOrange: { backgroundColor: '#E67E22' },
  labelText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  cardBody: { padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { flex: 1, fontSize: 17, fontWeight: '800', color: '#201060' },
  heartBtn: { padding: 4 },
  heartIcon: { fontSize: 18, color: '#D02010' },
  cardDesc: { fontSize: 13, color: '#6B6490', lineHeight: 19, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardPrice: { fontSize: 18, fontWeight: '900', color: '#D02010' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTime: { fontSize: 13, color: '#6B6490' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingStar: { fontSize: 13, color: '#F0C000' },
  ratingVal: { fontSize: 13, fontWeight: '600', color: '#6B6490' },

  addBtn: { borderRadius: 12, overflow: 'hidden' },
  addBtnDisabled: { opacity: 0.6 },
  addBtnGrad: { paddingVertical: 12, alignItems: 'center' },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
