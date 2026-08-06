import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, FlatList, useWindowDimensions, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';
import { MEALS, PROMOTIONS, CATEGORIES } from '@/lib/data/mock-data';
import { trpc } from '@/lib/trpc';
import { toMealCard, type MealCard } from '@/lib/utils';
const LOGO_CHEF = require('@/assets/images/logo-chef.png');

const EXPERIENCE_CARDS = [
  {
    id: 'bistro',
    title: 'Bistro',
    subtitle: 'Drinks & light bites',
    emoji: '🍹',
    gradient: ['#1A5276', '#0E3460'] as const,
    route: '/bistro',
  },
  {
    id: 'events',
    title: 'Events',
    subtitle: 'Book a seat at our next event',
    emoji: '🎉',
    gradient: ['#7D3C98', '#4A235A'] as const,
    route: '/events',
  },
  {
    id: 'fine-dining',
    title: 'Fine Dining',
    subtitle: 'Premium cuisine & ambiance',
    emoji: '🍽️',
    gradient: ['#7B241C', '#4A1511'] as const,
    route: '/fine-dining',
  },
];

const GREETING = (() => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
})();

export default function HomeScreen() {
  const { state } = useAppStore();
  const [search, setSearch] = useState('');
  const scrollY = useRef(new Animated.Value(0)).current;
  const { width: W } = useWindowDimensions();
  const CARD_W = W * 0.62;

  const cartCount = state.cartItems.reduce((s, i) => s + i.quantity, 0);

  // Live data from backend, fallback to mock data
  const { data: liveFeatured } = trpc.menu.featured.useQuery(undefined, { retry: 1, staleTime: 60_000 });
  const { data: livePopular } = trpc.menu.meals.useQuery({ popular: true }, { retry: 1, staleTime: 60_000 });
  const { data: liveBranches } = trpc.menu.branches.useQuery(undefined, { retry: 1, staleTime: 300_000 });

  const popularMeals: MealCard[] = (livePopular && livePopular.length > 0
    ? livePopular.map(m => toMealCard(m as unknown as Record<string, unknown>))
    : MEALS.filter(m => m.labels?.includes('popular') || m.labels?.includes('best_seller')).map(m => toMealCard(m as unknown as Record<string, unknown>))
  ).slice(0, 8);
  const featuredMeals: MealCard[] = (liveFeatured && liveFeatured.length > 0
    ? liveFeatured.map(m => toMealCard(m as unknown as Record<string, unknown>))
    : MEALS.map(m => toMealCard(m as unknown as Record<string, unknown>))
  ).slice(0, 6);

  const headerBg = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: ['rgba(192,57,43,0)', 'rgba(192,57,43,1)'],
    extrapolate: 'clamp',
  });

  const handleSearch = () => {
    if (search.trim()) router.push({ pathname: '/(tabs)/menu', params: { q: search } } as never);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Sticky animated header */}
      <Animated.View style={[styles.stickyHeader, { backgroundColor: headerBg }]}>
        <View style={styles.stickyHeaderInner}>
          <Image source={LOGO_CHEF} style={styles.headerLogo} contentFit="contain" />
          <Text style={styles.headerBrand}>Amala Oluyole</Text>
          <TouchableOpacity onPress={() => router.push('/notifications' as never)} style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Hero Banner ── */}
        <LinearGradient colors={['#201060', '#150B50', '#0D0A2E']} style={styles.hero}>
          <View style={styles.heroContent}>
            <Text style={styles.heroGreeting}>{GREETING} 👋</Text>
            <Text style={styles.heroTitle}>What are you{'\n'}craving today?</Text>
            <Text style={styles.heroSub}>Authentic Yoruba cuisine, delivered fresh</Text>
          </View>
          <View style={styles.heroBowl}>
            <Image source={LOGO_CHEF} style={styles.heroBowlImg} contentFit="contain" />
          </View>
        </LinearGradient>

        {/* ── Search Bar ── */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search meals, soups, proteins..."
              placeholderTextColor="#9B94C4"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Promotions Carousel ── */}
        {PROMOTIONS.length > 0 && (
          <View style={styles.section}>
            <FlatList
              data={PROMOTIONS}
              keyExtractor={p => p.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item: promo }) => (
                <LinearGradient
                  colors={promo.id === 'p1' ? ['#D02010', '#150B50'] : promo.id === 'p2' ? ['#27AE60', '#1A7A40'] : ['#E67E22', '#B05A10']}
                  style={styles.promoCard}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.promoEmoji}>{promo.id === 'p1' ? '🎉' : promo.id === 'p2' ? '🚚' : '👨‍👩‍👧‍👦'}</Text>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <Text style={styles.promoDesc} numberOfLines={2}>{promo.description}</Text>
                  {promo.code && (
                    <View style={styles.promoCodeBadge}>
                      <Text style={styles.promoCode}>{promo.code}</Text>
                    </View>
                  )}
                </LinearGradient>
              )}
            />
          </View>
        )}

        {/* ── Build Your Swallow CTA ── */}
        <View style={styles.sectionPadded}>
          <TouchableOpacity
            style={styles.builderCta}
            onPress={() => router.push('/meal/builder' as never)}
          >
            <LinearGradient colors={['#2A1A80', '#150B50']} style={styles.builderCtaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.builderCtaLeft}>
                <Text style={styles.builderCtaTitle}>Build Your Swallow 🍲</Text>
                <Text style={styles.builderCtaSub}>Choose swallow · soup · protein · extras</Text>
              </View>
              <View style={styles.builderCtaArrow}>
                <Text style={styles.builderCtaArrowText}>›</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Experiences ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sectionPadded]}>
            <Text style={styles.sectionTitle}>Experiences</Text>
          </View>
          <FlatList
            data={EXPERIENCE_CARDS}
            keyExtractor={e => e.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            renderItem={({ item: exp }) => (
              <TouchableOpacity
                style={[styles.expCard, { width: W * 0.55 }]}
                onPress={() => router.push(exp.route as never)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={exp.gradient} style={styles.expCardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.expEmoji}>{exp.emoji}</Text>
                  <Text style={styles.expTitle}>{exp.title}</Text>
                  <Text style={styles.expSub}>{exp.subtitle}</Text>
                  <View style={styles.expArrow}>
                    <Text style={styles.expArrowText}>›</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ── Categories ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/menu' as never)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={CATEGORIES}
            keyExtractor={c => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
            renderItem={({ item: cat }) => (
              <TouchableOpacity
                style={styles.catChip}
                onPress={() => router.push({ pathname: '/(tabs)/menu', params: { categoryId: cat.id } } as never)}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={styles.catName}>{cat.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ── Popular Meals ── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.sectionPadded]}>
            <Text style={styles.sectionTitle}>Popular Meals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/menu' as never)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularMeals}
            keyExtractor={m => String(m.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
            renderItem={({ item: meal }) => (
              <TouchableOpacity
                style={[styles.mealCard, { width: CARD_W }]}
                onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meal.id } } as never)}
              >
                <View style={styles.mealCardImgWrap}>
                  <Image source={{ uri: meal.imageUrl ?? undefined }} style={styles.mealCardImg} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={styles.mealCardImgGrad} />
                  {(meal.labels?.includes('popular') || meal.labels?.includes('best_seller')) && (
                    <View style={[styles.mealBadge, meal.labels?.includes('best_seller') && styles.mealBadgeBest]}>
                      <Text style={styles.mealBadgeText}>{meal.labels?.includes('best_seller') ? 'Best Seller' : 'Popular'}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.heartBtn}>
                    <Text style={styles.heartIcon}>♡</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.mealCardBody}>
                  <Text style={styles.mealCardName} numberOfLines={1}>{meal.name}</Text>
                  <Text style={styles.mealCardDesc} numberOfLines={2}>{meal.description}</Text>
                  <View style={styles.mealCardFooter}>
                    <Text style={styles.mealCardPrice}>₦{meal.price.toLocaleString()}</Text>
                    <View style={styles.mealCardMeta}>
                      <Text style={styles.mealCardStar}>★</Text>
                      <Text style={styles.mealCardRating}>{meal.rating}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* ── All Meals Grid ── */}
        <View style={styles.sectionPadded}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>All Meals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/menu' as never)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {featuredMeals.map(meal => (
            <TouchableOpacity
              key={meal.id}
              style={styles.listCard}
              onPress={() => router.push({ pathname: '/meal/[id]', params: { id: meal.id } } as never)}
            >
              <Image source={{ uri: meal.imageUrl ?? undefined }} style={styles.listCardImg} contentFit="cover" />
              <View style={styles.listCardBody}>
                <View style={styles.listCardTop}>
                  <Text style={styles.listCardName} numberOfLines={1}>{meal.name}</Text>
                  {meal.labels?.includes('chefs_choice') && (
                    <View style={styles.chefBadge}><Text style={styles.chefBadgeText}>Chef's</Text></View>
                  )}
                </View>
                <Text style={styles.listCardDesc} numberOfLines={2}>{meal.description}</Text>
                <View style={styles.listCardFooter}>
                  <Text style={styles.listCardPrice}>₦{meal.price.toLocaleString()}</Text>
                  <View style={styles.listCardRight}>
                    <Text style={styles.listCardTime}>⏱ {meal.preparationTime}m</Text>
                    <View style={styles.listCardRating}>
                      <Text style={styles.listCardStar}>★</Text>
                      <Text style={styles.listCardRatingText}>{meal.rating}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },

  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    paddingTop: 52, paddingBottom: 8,
  },
  stickyHeaderInner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLogo: { width: 36, height: 36 },
  headerBrand: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.3 },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 22 },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#F39C12',
  },

  hero: {
    paddingTop: 100, paddingBottom: 32, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  heroContent: { flex: 1 },
  heroGreeting: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginBottom: 6 },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#FFF', lineHeight: 36, marginBottom: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroBowl: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12,
  },
  heroBowlEmoji: { fontSize: 52 },
  heroBowlImg: { width: 90, height: 90 },

  searchContainer: {
    paddingHorizontal: 16, marginTop: -20, marginBottom: 4, zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    gap: 10,
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 15, color: '#201060' },
  searchClear: { fontSize: 16, color: '#6B6490', paddingHorizontal: 4 },

  section: { marginTop: 20 },
  sectionPadded: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#201060' },
  seeAll: { fontSize: 14, fontWeight: '600', color: '#D02010' },

  promoCard: {
    width: '72%', borderRadius: 18, padding: 18, gap: 4,
  },
  promoEmoji: { fontSize: 28, marginBottom: 4 },
  promoTitle: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  promoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  promoCodeBadge: {
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  promoCode: { fontSize: 13, fontWeight: '800', color: '#FFF', letterSpacing: 1 },

  builderCta: { borderRadius: 18, overflow: 'hidden' },
  builderCtaGrad: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  builderCtaLeft: { flex: 1 },
  builderCtaTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginBottom: 4 },
  builderCtaSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  builderCtaArrow: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  builderCtaArrowText: { fontSize: 24, color: '#FFF', fontWeight: '700', marginTop: -2 },

  catChip: {
    alignItems: 'center', gap: 6,
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#EDEAFB',
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  catIcon: { fontSize: 24 },
  catName: { fontSize: 11, fontWeight: '600', color: '#201060', textAlign: 'center' },

  mealCard: {
    backgroundColor: '#FFF', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  mealCardImgWrap: { height: 160, position: 'relative' },
  mealCardImg: { width: '100%', height: '100%' },
  mealCardImgGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  mealBadge: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: '#D02010', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  mealBadgeBest: { backgroundColor: '#F0C000' },
  mealBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  heartBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  heartIcon: { fontSize: 16, color: '#D02010' },
  mealCardBody: { padding: 12 },
  mealCardName: { fontSize: 15, fontWeight: '700', color: '#201060', marginBottom: 4 },
  mealCardDesc: { fontSize: 12, color: '#6B6490', lineHeight: 17, marginBottom: 8 },
  mealCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealCardPrice: { fontSize: 16, fontWeight: '800', color: '#D02010' },
  mealCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  mealCardStar: { fontSize: 13, color: '#F0C000' },
  mealCardRating: { fontSize: 13, fontWeight: '600', color: '#6B6490' },

  listCard: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16,
    marginBottom: 12, overflow: 'hidden',
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  listCardImg: { width: 100, height: 100 },
  listCardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  listCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listCardName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#201060' },
  chefBadge: {
    backgroundColor: '#F4F3FB', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: '#E67E22',
  },
  chefBadgeText: { fontSize: 10, fontWeight: '700', color: '#E67E22' },
  listCardDesc: { fontSize: 12, color: '#6B6490', lineHeight: 17, marginTop: 4 },
  listCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  listCardPrice: { fontSize: 15, fontWeight: '800', color: '#D02010' },
  listCardRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listCardTime: { fontSize: 12, color: '#6B6490' },
  listCardRating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  listCardStar: { fontSize: 12, color: '#F0C000' },
  listCardRatingText: { fontSize: 12, fontWeight: '600', color: '#6B6490' },

  expCard: { borderRadius: 18, overflow: 'hidden' },
  expCardGrad: { padding: 20, minHeight: 130, justifyContent: 'space-between' },
  expEmoji: { fontSize: 32, marginBottom: 6 },
  expTitle: { fontSize: 18, fontWeight: '900', color: '#FFF', marginBottom: 2 },
  expSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 17 },
  expArrow: {
    alignSelf: 'flex-end', marginTop: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  expArrowText: { fontSize: 18, color: '#FFF', fontWeight: '700' },
});
