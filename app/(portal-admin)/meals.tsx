import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Switch, RefreshControl,
  ScrollView, TextInput, Alert, Platform, useWindowDimensions, FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { PortalLayout } from '@/components/portal-layout';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'expo-router';

type Meal = {
  id: number;
  name: string;
  price: string;
  isAvailable: boolean;
  isPopular: boolean;
  isBestSeller: boolean;
  isChefSpecial: boolean;
  categoryId: number;
  imageUrl?: string | null;
  preparationTime?: number | null;
};

type Category = { id: number; name: string; emoji?: string | null };

function PriceEditor({
  meal,
  onSave,
}: {
  meal: Meal;
  onSave: (id: number, price: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(Math.round(Number(meal.price))));

  const commit = useCallback(() => {
    const n = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(n) && n > 0) {
      onSave(meal.id, n);
    } else {
      setVal(String(Math.round(Number(meal.price))));
    }
    setEditing(false);
  }, [val, meal.id, meal.price, onSave]);

  if (editing) {
    return (
      <View style={styles.priceEditRow}>
        <Text style={styles.naira}>₦</Text>
        <TextInput
          style={styles.priceInput}
          value={val}
          onChangeText={setVal}
          keyboardType="numeric"
          autoFocus
          selectTextOnFocus
          onBlur={commit}
          onSubmitEditing={commit}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.savePriceBtn} onPress={commit}>
          <Text style={styles.savePriceBtnText}>✓</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.priceDisplay} onPress={() => setEditing(true)}>
      <Text style={styles.priceText}>₦{Number(meal.price).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</Text>
      <Text style={styles.editHint}>✎</Text>
    </TouchableOpacity>
  );
}

function MealCard({
  meal,
  isDesktop,
  onToggle,
  onPriceSave,
  onEdit,
  onDelete,
}: {
  meal: Meal;
  isDesktop: boolean;
  onToggle: (id: number, branchId: number, val: boolean) => void;
  onPriceSave: (id: number, price: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, name: string) => void;
}) {
  return (
    <View style={[styles.mealCard, !meal.isAvailable && styles.mealCardUnavailable]}>
      {/* Meal image */}
      {meal.imageUrl ? (
        <Image
          source={{ uri: meal.imageUrl }}
          style={styles.mealImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
          <Text style={styles.mealImageEmoji}>🍽️</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.mealContent}>
        <View style={styles.mealTopRow}>
          <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {meal.isPopular && <View style={[styles.badge, { backgroundColor: '#F0C000' }]}><Text style={styles.badgeText}>Popular</Text></View>}
            {meal.isBestSeller && <View style={[styles.badge, { backgroundColor: '#D02010' }]}><Text style={styles.badgeText}>Best Seller</Text></View>}
            {meal.isChefSpecial && <View style={[styles.badge, { backgroundColor: '#201060' }]}><Text style={styles.badgeText}>Chef's Special</Text></View>}
          </View>
        </View>

        <View style={styles.mealBottomRow}>
          {/* Price editor */}
          <PriceEditor meal={meal} onSave={onPriceSave} />

          {/* Prep time */}
          {meal.preparationTime ? (
            <Text style={styles.prepTime}>⏱ {meal.preparationTime}m</Text>
          ) : null}

          {/* Availability toggle */}
          <View style={styles.availRow}>
            <Text style={[styles.availLabel, { color: meal.isAvailable ? '#22C55E' : '#EF4444' }]}>
              {meal.isAvailable ? 'Available' : 'Unavailable'}
            </Text>
            <Switch
              value={meal.isAvailable}
              onValueChange={(v) => onToggle(meal.id, 1, v)}
              trackColor={{ true: '#22C55E', false: '#EF4444' }}
              thumbColor="#fff"
            />
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(meal.id)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(meal.id, meal.name)}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function AdminMealsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { data: allMeals, refetch, isRefetching } = trpc.admin.allMeals.useQuery();
  const { data: categories } = trpc.menu.categories.useQuery();
  const toggleAvail = trpc.kitchen.toggleMealAvailability.useMutation({ onSuccess: () => refetch() });
  const updateMeal = trpc.admin.updateMeal.useMutation({ onSuccess: () => refetch() });
  const deleteMeal = trpc.admin.deleteMeal.useMutation({ onSuccess: () => refetch() });

  const handlePriceSave = useCallback((id: number, price: number) => {
    updateMeal.mutate({ id, price });
  }, [updateMeal]);

  const handleToggle = useCallback((mealId: number, branchId: number, val: boolean) => {
    toggleAvail.mutate({ mealId, branchId, isAvailable: val });
  }, [toggleAvail]);

  const handleDelete = useCallback((id: number, name: string) => {
    Alert.alert(
      'Remove Meal',
      `Remove "${name}" from the menu?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => deleteMeal.mutate({ id }) },
      ]
    );
  }, [deleteMeal]);

  const handleEdit = useCallback((id: number) => {
    router.push({ pathname: '/admin/add-meal', params: { mealId: id } } as never);
  }, [router]);

  // Filter meals
  const filtered = (allMeals ?? []).filter((m: Meal) => {
    const matchCat = selectedCategory === null || m.categoryId === selectedCategory;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const availableCount = filtered.filter((m: Meal) => m.isAvailable).length;
  const unavailableCount = filtered.length - availableCount;

  const categoryList = [{ id: 0, name: 'All Items', emoji: '🍽️' }, ...(categories ?? [])] as (Category & { id: number })[];

  return (
    <PortalLayout portal="admin" title="Menu Management">
      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* Category sidebar (desktop) / horizontal scroll (mobile) */}
        {isDesktop ? (
          <View style={styles.catSidebar}>
            <Text style={styles.catSidebarTitle}>Categories</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categoryList.map(cat => {
                const count = cat.id === 0
                  ? (allMeals ?? []).length
                  : (allMeals ?? []).filter((m: Meal) => m.categoryId === cat.id).length;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catItem, selectedCategory === (cat.id === 0 ? null : cat.id) && styles.catItemActive]}
                    onPress={() => setSelectedCategory(cat.id === 0 ? null : cat.id)}
                  >
                    <Text style={styles.catEmoji}>{cat.emoji ?? '🍽️'}</Text>
                    <Text style={[styles.catName, selectedCategory === (cat.id === 0 ? null : cat.id) && styles.catNameActive]} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <View style={[styles.catCount, selectedCategory === (cat.id === 0 ? null : cat.id) && styles.catCountActive]}>
                      <Text style={[styles.catCountText, selectedCategory === (cat.id === 0 ? null : cat.id) && styles.catCountTextActive]}>{count}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Main content */}
        <View style={styles.mainContent}>
          {/* Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search meals..."
                placeholderTextColor="#9B94C4"
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.searchClear}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statChip, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.statChipText, { color: '#22C55E' }]}>✓ {availableCount} available</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: '#FEF2F2' }]}>
                <Text style={[styles.statChipText, { color: '#EF4444' }]}>✕ {unavailableCount} off</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/admin/add-meal' as never)}
            >
              <Text style={styles.addBtnText}>+ Add Meal</Text>
            </TouchableOpacity>
          </View>

          {/* Mobile category chips */}
          {!isDesktop && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catChips} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {categoryList.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, selectedCategory === (cat.id === 0 ? null : cat.id) && styles.catChipActive]}
                  onPress={() => setSelectedCategory(cat.id === 0 ? null : cat.id)}
                >
                  <Text style={[styles.catChipText, selectedCategory === (cat.id === 0 ? null : cat.id) && styles.catChipTextActive]}>
                    {cat.emoji} {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Meal list */}
          <FlatList
            data={filtered as Meal[]}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#201060" />}
            contentContainerStyle={[styles.list, isDesktop && styles.listDesktop]}
            numColumns={isDesktop ? 2 : 1}
            key={isDesktop ? 'desktop' : 'mobile'}
            columnWrapperStyle={isDesktop ? { gap: 14 } : undefined}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🍽️</Text>
                <Text style={styles.emptyTitle}>No meals found</Text>
                <Text style={styles.emptyText}>
                  {search ? `No results for "${search}"` : 'This category is empty. Add a meal to get started.'}
                </Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/admin/add-meal' as never)}>
                  <Text style={styles.addBtnText}>+ Add Meal</Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <View style={isDesktop ? { flex: 1 } : {}}>
                <MealCard
                  meal={item}
                  isDesktop={isDesktop}
                  onToggle={handleToggle}
                  onPriceSave={handlePriceSave}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </View>
            )}
          />
        </View>
      </View>
    </PortalLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerDesktop: { flexDirection: 'row' },
  // Category sidebar
  catSidebar: {
    width: 200, backgroundColor: '#FFFFFF', borderRightWidth: 1,
    borderRightColor: '#E8E4F8', padding: 16,
  },
  catSidebarTitle: { fontSize: 11, fontWeight: '700', color: '#9B94C4', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  catItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, marginBottom: 2 },
  catItemActive: { backgroundColor: '#201060' },
  catEmoji: { fontSize: 16 },
  catName: { flex: 1, fontSize: 13, color: '#201060', fontWeight: '500' },
  catNameActive: { color: '#FFFFFF', fontWeight: '700' },
  catCount: { backgroundColor: '#F4F3FB', borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  catCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  catCountText: { fontSize: 11, color: '#6B6490', fontWeight: '600' },
  catCountTextActive: { color: '#FFFFFF' },
  // Main
  mainContent: { flex: 1 },
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E8E4F8',
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: 1, minWidth: 180, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F4F3FB', borderRadius: 10, paddingHorizontal: 12, height: 40,
  },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, color: '#201060', outlineStyle: 'none' } as never,
  searchClear: { fontSize: 12, color: '#9B94C4', paddingLeft: 6 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statChipText: { fontSize: 12, fontWeight: '600' },
  addBtn: { backgroundColor: '#201060', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  // Mobile category chips
  catChips: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8E4F8', paddingVertical: 10 },
  catChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F4F3FB', borderWidth: 1, borderColor: '#E0DEEF' },
  catChipActive: { backgroundColor: '#201060', borderColor: '#201060' },
  catChipText: { fontSize: 12, color: '#6B6490', fontWeight: '600' },
  catChipTextActive: { color: '#FFFFFF' },
  // List
  list: { padding: 16, paddingBottom: 80 },
  listDesktop: { padding: 20 },
  // Meal card
  mealCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#E8E4F8',
    shadowColor: '#201060', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    overflow: 'hidden',
  },
  mealCardUnavailable: { opacity: 0.65 },
  mealImage: { width: '100%', height: 140 },
  mealImagePlaceholder: { backgroundColor: '#F4F3FB', alignItems: 'center', justifyContent: 'center' },
  mealImageEmoji: { fontSize: 40 },
  mealContent: { padding: 14 },
  mealTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 8 },
  mealName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#201060' },
  badgeRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  mealBottomRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  // Price editor
  priceDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F4F3FB', borderRadius: 8 },
  priceText: { fontSize: 15, fontWeight: '800', color: '#201060' },
  editHint: { fontSize: 12, color: '#9B94C4' },
  priceEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  naira: { fontSize: 14, color: '#201060', fontWeight: '700' },
  priceInput: {
    width: 90, height: 34, borderWidth: 1.5, borderColor: '#201060',
    borderRadius: 8, paddingHorizontal: 8, fontSize: 14, color: '#201060',
    fontWeight: '700', outlineStyle: 'none',
  } as never,
  savePriceBtn: { backgroundColor: '#201060', borderRadius: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  savePriceBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  prepTime: { fontSize: 12, color: '#9B94C4' },
  // Availability
  availRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  availLabel: { fontSize: 12, fontWeight: '600' },
  // Card actions
  cardActions: { flexDirection: 'row', gap: 6 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F4F3FB', borderRadius: 8 },
  editBtnText: { fontSize: 12, color: '#201060', fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FEF2F2', borderRadius: 8 },
  deleteBtnText: { fontSize: 12, color: '#EF4444', fontWeight: '700' },
  // Empty state
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#201060' },
  emptyText: { fontSize: 14, color: '#9B94C4', textAlign: 'center', maxWidth: 300 },
});
