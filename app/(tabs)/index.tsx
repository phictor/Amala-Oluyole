import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  FlatList, StyleSheet, Image,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { MEALS, CATEGORIES, PROMOTIONS } from '@/lib/data/mock-data';
import type { Meal } from '@/lib/data/types';

const LABEL_CONFIG = {
  popular: { text: 'Popular', bg: '#C0392B', color: '#FFF' },
  new: { text: 'New', bg: '#27AE60', color: '#FFF' },
  chefs_choice: { text: "Chef's Choice", bg: '#F39C12', color: '#FFF' },
  best_seller: { text: 'Best Seller', bg: '#6B3A2A', color: '#FFF' },
};

function MealCard({ meal, onPress, onFavourite, isFavourite }: {
  meal: Meal;
  onPress: () => void;
  onFavourite: () => void;
  isFavourite: boolean;
}) {
  return (
    <TouchableOpacity style={styles.mealCard} onPress={onPress}>
      <View style={styles.mealImageContainer}>
        <Image source={{ uri: meal.imageUrl }} style={styles.mealImage} />
        <TouchableOpacity style={styles.favBtn} onPress={onFavourite}>
          <Text style={styles.favIcon}>{isFavourite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
        {meal.labels && meal.labels.length > 0 && (
          <View style={[styles.labelBadge, { backgroundColor: LABEL_CONFIG[meal.labels[0]].bg }]}>
            <Text style={[styles.labelText, { color: LABEL_CONFIG[meal.labels[0]].color }]}>
              {LABEL_CONFIG[meal.labels[0]].text}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
        <Text style={styles.mealDesc} numberOfLines={2}>{meal.description}</Text>
        <View style={styles.mealFooter}>
          <Text style={styles.mealPrice}>₦{meal.price.toLocaleString()}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.ratingText}>⭐ {meal.rating?.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { state, dispatch } = useAppStore();
  const [search, setSearch] = useState('');
  const branch = state.selectedBranch;
  const featuredMeals = MEALS.filter(m => m.labels?.includes('popular') || m.labels?.includes('best_seller'));

  const handleMealPress = (meal: Meal) => {
    router.push({ pathname: '/meal/[id]' as never, params: { id: meal.id } });
  };

  const handleSearch = () => {
    if (search.trim()) {
      router.push({ pathname: '/(tabs)/menu' as never, params: { q: search } });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good day! 👋</Text>
              <TouchableOpacity
                style={styles.branchRow}
                onPress={() => router.push('/branch-select' as never)}
              >
                <Text style={styles.branchText}>
                  📍 {branch ? branch.name : 'Select a branch'}
                </Text>
                <Text style={styles.branchChevron}>›</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => router.push('/notifications' as never)}
            >
              <Text style={styles.notifIcon}>🔔</Text>
              {state.unreadNotificationCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{state.unreadNotificationCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for meals..."
              placeholderTextColor="#A08070"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Promo Banner */}
        {PROMOTIONS.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoScroll}
          >
            {PROMOTIONS.map(promo => (
              <TouchableOpacity key={promo.id} style={styles.promoBanner}>
                <Text style={styles.promoEmoji}>🎉</Text>
                <View style={styles.promoText}>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <Text style={styles.promoDesc} numberOfLines={1}>{promo.description}</Text>
                  {promo.code && <Text style={styles.promoCode}>Code: {promo.code}</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Build Your Meal CTA */}
        <TouchableOpacity
          style={styles.buildMealCta}
          onPress={() => router.push('/meal/builder' as never)}
        >
          <View style={styles.buildMealLeft}>
            <Text style={styles.buildMealTitle}>Build Your Swallow 🍲</Text>
            <Text style={styles.buildMealSubtitle}>Choose your swallow, soup, protein & extras</Text>
          </View>
          <Text style={styles.buildMealArrow}>›</Text>
        </TouchableOpacity>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/menu' as never)}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryChip}
              onPress={() => router.push({ pathname: '/(tabs)/menu' as never, params: { categoryId: cat.id } })}
            >
              <Text style={styles.categoryEmoji}>{cat.icon}</Text>
              <Text style={styles.categoryName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Meals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Meals</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/menu' as never)}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={featuredMeals}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mealsScroll}
          renderItem={({ item }) => (
            <MealCard
              meal={item}
              onPress={() => handleMealPress(item)}
              isFavourite={state.favouriteMealIds.includes(item.id)}
              onFavourite={() => dispatch({ type: 'TOGGLE_FAVOURITE', payload: item.id })}
            />
          )}
        />

        {/* All Meals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Meals</Text>
        </View>
        {MEALS.map(meal => (
          <TouchableOpacity
            key={meal.id}
            style={styles.listMealCard}
            onPress={() => handleMealPress(meal)}
          >
            <Image source={{ uri: meal.imageUrl }} style={styles.listMealImage} />
            <View style={styles.listMealInfo}>
              <Text style={styles.listMealName}>{meal.name}</Text>
              <Text style={styles.listMealDesc} numberOfLines={2}>{meal.description}</Text>
              <View style={styles.listMealFooter}>
                <Text style={styles.listMealPrice}>₦{meal.price.toLocaleString()}</Text>
                <Text style={styles.listMealTime}>🕐 {meal.preparationTime} min</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting: { fontSize: 14, color: '#8B6F5E', marginBottom: 4 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  branchText: { fontSize: 16, fontWeight: '700', color: '#1A0F0A' },
  branchChevron: { fontSize: 20, color: '#C0392B', fontWeight: '700' },
  notifBtn: { position: 'relative', padding: 4 },
  notifIcon: { fontSize: 24 },
  notifBadge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#C0392B', borderRadius: 8, width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1A0F0A',
  },
  searchBtn: {
    backgroundColor: '#C0392B', borderRadius: 12, width: 48, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { fontSize: 18 },
  promoScroll: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  promoBanner: {
    backgroundColor: '#C0392B', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, width: 280,
  },
  promoEmoji: { fontSize: 32 },
  promoText: { flex: 1 },
  promoTitle: { fontSize: 15, fontWeight: '700', color: '#FFF', marginBottom: 2 },
  promoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  promoCode: { fontSize: 12, color: '#F39C12', fontWeight: '700', marginTop: 4 },
  buildMealCta: {
    marginHorizontal: 20, marginVertical: 12, backgroundColor: '#6B3A2A',
    borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center',
  },
  buildMealLeft: { flex: 1 },
  buildMealTitle: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  buildMealSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  buildMealArrow: { fontSize: 32, color: '#F39C12', fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginTop: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1A0F0A' },
  seeAll: { fontSize: 14, color: '#C0392B', fontWeight: '600' },
  categoriesScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 4 },
  categoryChip: {
    backgroundColor: '#FFF5EC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#E8D5C4', minWidth: 80,
  },
  categoryEmoji: { fontSize: 24, marginBottom: 4 },
  categoryName: { fontSize: 11, fontWeight: '600', color: '#6B3A2A', textAlign: 'center' },
  mealsScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 4 },
  mealCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, width: 200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    overflow: 'hidden',
  },
  mealImageContainer: { position: 'relative' },
  mealImage: { width: '100%', height: 140, backgroundColor: '#F0E4D8' },
  favBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 4 },
  favIcon: { fontSize: 18 },
  labelBadge: { position: 'absolute', bottom: 8, left: 8, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  labelText: { fontSize: 10, fontWeight: '700' },
  mealInfo: { padding: 12 },
  mealName: { fontSize: 15, fontWeight: '700', color: '#1A0F0A', marginBottom: 4 },
  mealDesc: { fontSize: 12, color: '#8B6F5E', lineHeight: 18, marginBottom: 8 },
  mealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealPrice: { fontSize: 16, fontWeight: '800', color: '#C0392B' },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, color: '#8B6F5E' },
  listMealCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: 20,
    marginBottom: 12, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  listMealImage: { width: 100, height: 100, backgroundColor: '#F0E4D8' },
  listMealInfo: { flex: 1, padding: 12, justifyContent: 'space-between' },
  listMealName: { fontSize: 15, fontWeight: '700', color: '#1A0F0A' },
  listMealDesc: { fontSize: 12, color: '#8B6F5E', lineHeight: 18, marginVertical: 4 },
  listMealFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listMealPrice: { fontSize: 15, fontWeight: '800', color: '#C0392B' },
  listMealTime: { fontSize: 12, color: '#8B6F5E' },
});
