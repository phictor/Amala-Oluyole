import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '@/lib/store/app-store';

const BISTRO_CATEGORIES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'drinks', label: 'Drinks', emoji: '🥤' },
  { id: 'cocktails', label: 'Cocktails', emoji: '🍹' },
  { id: 'snacks', label: 'Snacks', emoji: '🍿' },
  { id: 'pastries', label: 'Pastries', emoji: '🥐' },
  { id: 'desserts', label: 'Desserts', emoji: '🍰' },
];

const BISTRO_ITEMS = [
  // Drinks
  { id: 'b1', category: 'drinks', name: 'Chapman', description: 'Classic Nigerian Chapman with Fanta, Sprite, Grenadine, cucumber and orange slices.', price: 1500, emoji: '🍊', badge: 'Fan Favourite', image: '/manus-storage/bistro-drinks_99bdd786.jpg' },
  { id: 'b2', category: 'drinks', name: 'Zobo Delight', description: 'Chilled hibiscus drink with ginger, pineapple and a hint of cloves.', price: 800, emoji: '🌺', badge: 'Local', image: '/manus-storage/bistro-drinks_99bdd786.jpg' },
  { id: 'b3', category: 'drinks', name: 'Kunu Aya', description: 'Refreshing tiger nut drink, naturally sweet and dairy-free.', price: 700, emoji: '🥛', badge: 'Healthy', image: '/manus-storage/bistro-drinks_99bdd786.jpg' },
  { id: 'b4', category: 'drinks', name: 'Bottled Water', description: 'Chilled 75cl still water.', price: 300, emoji: '💧', badge: null },
  { id: 'b5', category: 'drinks', name: 'Soft Drinks', description: 'Coke, Fanta, Sprite, Malt — chilled and ready.', price: 500, emoji: '🥤', badge: null },
  { id: 'b6', category: 'drinks', name: 'Fruit Juice', description: 'Freshly blended seasonal fruits — no added sugar.', price: 1200, emoji: '🍓', badge: 'Fresh', image: '/manus-storage/bistro-drinks_99bdd786.jpg' },
  // Cocktails
  { id: 'c1', category: 'cocktails', name: 'Wazobia Punch', description: 'A bold blend of palm wine, pineapple juice and ginger beer.', price: 2500, emoji: '🍹', badge: 'Signature', image: '/manus-storage/bistro-cocktails_46ad81ec.jpg' },
  { id: 'c2', category: 'cocktails', name: 'Lagos Sunset', description: 'Mango, passion fruit and a splash of grenadine over ice.', price: 2200, emoji: '🌅', badge: 'Popular', image: '/manus-storage/bistro-cocktails_46ad81ec.jpg' },
  { id: 'c3', category: 'cocktails', name: 'Ibadan Breeze', description: 'Coconut water, lime and mint — light and refreshing.', price: 2000, emoji: '🌴', badge: null, image: '/manus-storage/bistro-cocktails_46ad81ec.jpg' },
  { id: 'c4', category: 'cocktails', name: 'Mocktail of the Day', description: "Ask your server for today's special creation.", price: 1800, emoji: '✨', badge: 'Daily Special', image: '/manus-storage/bistro-cocktails_46ad81ec.jpg' },
  // Snacks
  { id: 's1', category: 'snacks', name: 'Puff Puff', description: 'Golden deep-fried dough balls, lightly sweetened. Served with pepper sauce.', price: 600, emoji: '🟡', badge: 'Bestseller', image: '/manus-storage/bistro-snacks_cb3edcac.jpg' },
  { id: 's2', category: 'snacks', name: 'Samosa (3 pcs)', description: 'Crispy pastry filled with spiced minced beef and vegetables.', price: 900, emoji: '🥟', badge: null, image: '/manus-storage/bistro-snacks_cb3edcac.jpg' },
  { id: 's3', category: 'snacks', name: 'Chin Chin', description: 'Crunchy fried dough snack, lightly spiced. Perfect with a cold drink.', price: 500, emoji: '🟤', badge: null, image: '/manus-storage/bistro-snacks_cb3edcac.jpg' },
  { id: 's4', category: 'snacks', name: 'Suya Skewers (2 pcs)', description: 'Spiced grilled beef skewers with onion and tomato.', price: 1500, emoji: '🍢', badge: 'Hot & Spicy', image: '/manus-storage/bistro-snacks_cb3edcac.jpg' },
  { id: 's5', category: 'snacks', name: 'Spring Rolls (4 pcs)', description: 'Crispy rolls filled with seasoned vegetables and chicken.', price: 1200, emoji: '🌯', badge: null, image: '/manus-storage/bistro-snacks_cb3edcac.jpg' },
  // Pastries
  { id: 'p1', category: 'pastries', name: 'Meat Pie', description: 'Flaky shortcrust pastry filled with seasoned minced meat, potatoes and carrots.', price: 800, emoji: '🥧', badge: 'Classic' },
  { id: 'p2', category: 'pastries', name: 'Sausage Roll', description: 'Buttery puff pastry wrapped around a seasoned pork sausage.', price: 700, emoji: '🌭', badge: null },
  { id: 'p3', category: 'pastries', name: 'Doughnut', description: 'Soft ring doughnut glazed with sugar icing. Chocolate or vanilla.', price: 600, emoji: '🍩', badge: null },
  { id: 'p4', category: 'pastries', name: 'Croissant', description: 'Buttery, flaky croissant. Plain or with chocolate filling.', price: 900, emoji: '🥐', badge: null },
  // Desserts
  { id: 'd1', category: 'desserts', name: 'Pineapple Cake Slice', description: 'Moist vanilla sponge with pineapple cream frosting.', price: 1200, emoji: '🍰', badge: 'Chef\'s Pick' },
  { id: 'd2', category: 'desserts', name: 'Ice Cream (2 scoops)', description: 'Vanilla, chocolate or strawberry — served in a waffle cone.', price: 1000, emoji: '🍦', badge: null },
  { id: 'd3', category: 'desserts', name: 'Chin Chin Ice Cream', description: 'Vanilla ice cream topped with crunchy chin chin and caramel drizzle.', price: 1400, emoji: '🍨', badge: 'Signature' },
];

export default function BistroScreen() {
  const [activeCategory, setActiveCategory] = useState('all');

  const { dispatch, state } = useAppStore();
  const { width: W } = useWindowDimensions();

  const handleAddToCart = (item: { id: string; name: string; price: number }) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    dispatch({
      type: 'ADD_TO_CART',
      payload: {
        id: `bistro-${item.id}`,
        quantity: 1,
        unitPrice: item.price,
        totalPrice: item.price,
        specialInstructions: `Bistro: ${item.name}`,
      },
    });
    Alert.alert(
      'Added to Cart',
      `${item.name} has been added to your cart.`,
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/(tabs)/cart' as never) },
      ],
    );
  };

  const getCartQty = (itemId: string) =>
    state.cartItems.find(i => i.id === `bistro-${itemId}`)?.quantity ?? 0;

  const filtered = activeCategory === 'all'
    ? BISTRO_ITEMS
    : BISTRO_ITEMS.filter(i => i.category === activeCategory);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <LinearGradient colors={['#1A5276', '#0E3460', '#0A2040']} style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={s.headerContent}>
            <Text style={s.headerEmoji}>🍹</Text>
            <Text style={s.headerTitle}>Amala Oluyole Bistro</Text>
            <Text style={s.headerSub}>Drinks · Cocktails · Light Bites · Desserts</Text>
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>📍 Oluyole, Ibadan  ·  10:00 AM – 11:00 PM</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Category Filter */}
        <View style={s.catSection}>
          <FlatList
            data={BISTRO_CATEGORIES}
            keyExtractor={c => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item: cat }) => (
              <TouchableOpacity
                style={[s.catChip, activeCategory === cat.id && s.catChipActive]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={s.catEmoji}>{cat.emoji}</Text>
                <Text style={[s.catLabel, activeCategory === cat.id && s.catLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Items Grid */}
        <View style={s.grid}>
          {filtered.map(item => {
            const qty = getCartQty(item.id);
            return (
            <View key={item.id} style={s.itemCard}>
              <LinearGradient
                colors={
                  item.category === 'drinks' ? ['#EBF5FB', '#D6EAF8'] :
                  item.category === 'cocktails' ? ['#F5EEF8', '#EBD5F5'] :
                  item.category === 'snacks' ? ['#FEF9E7', '#FDEBD0'] :
                  item.category === 'pastries' ? ['#FDF2E9', '#FAD7A0'] :
                  ['#FDF9F0', '#FDEBD0']
                }
                style={s.itemCardGrad}
              >
                {(item as { image?: string }).image ? (
                  <View style={s.itemImageContainer}>
                    <Image
                      source={(item as { image?: string }).image}
                      style={s.itemImage}
                      contentFit="cover"
                      transition={300}
                    />
                    {item.badge && (
                      <View style={s.itemImageBadge}>
                        <Text style={s.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={s.itemTop}>
                    <Text style={s.itemEmoji}>{item.emoji}</Text>
                    {item.badge && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>
                )}
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemDesc} numberOfLines={2}>{item.description}</Text>
                <View style={s.itemFooter}>
                  <Text style={s.itemPrice}>₦{item.price.toLocaleString()}</Text>
                  <TouchableOpacity
                    style={[s.addBtn, qty > 0 && s.addBtnActive]}
                    onPress={() => handleAddToCart(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.addBtnText}>{qty > 0 ? `✓ ${qty}` : '+ Add'}</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
            );
          })}
        </View>

        {/* Visit CTA */}
        <View style={s.ctaCard}>
          <Text style={s.ctaTitle}>Visit the Bistro</Text>
          <Text style={s.ctaText}>
            Walk in or call ahead. Our bistro is open daily from 10 AM to 11 PM.
            Perfect for a quick drink, a light bite, or a relaxed evening out.
          </Text>
          <TouchableOpacity
            style={s.ctaBtn}
        onPress={() => router.push('/contact' as never)}
            activeOpacity={0.8}
          >
            <Text style={s.ctaBtnText}>📞 Get Directions & Contact</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  header: { paddingTop: 52, paddingBottom: 28, paddingHorizontal: 20 },
  backBtn: { marginBottom: 12 },
  backIcon: { fontSize: 22, color: '#FFF', fontWeight: '700' },
  headerContent: { alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 48, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  headerBadge: {
    marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  headerBadgeText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  catSection: { marginTop: 16, marginBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F4F3FB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipActive: { backgroundColor: '#1A5276', borderColor: '#1A5276' },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#201060' },
  catLabelActive: { color: '#FFF' },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 12, marginTop: 12,
  },
  itemCard: {
    width: '47%',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#1A1640', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  itemCardGrad: { padding: 14, minHeight: 160 },
  itemImageContainer: {
    height: 90, borderRadius: 10, overflow: 'hidden',
    marginBottom: 10, position: 'relative',
  },
  itemImage: { width: '100%', height: '100%' },
  itemImageBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#D02010', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  itemEmoji: { fontSize: 32 },
  badge: {
    backgroundColor: '#D02010', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  itemName: { fontSize: 14, fontWeight: '800', color: '#201060', marginBottom: 4 },
  itemDesc: { fontSize: 11, color: '#6B6490', lineHeight: 16, flex: 1 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: '#D02010' },
  addBtn: {
    backgroundColor: '#1A5276', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  addBtnActive: { backgroundColor: '#27AE60' },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  ctaCard: {
    margin: 16, marginTop: 20,
    backgroundColor: '#EBF5FB', borderRadius: 18, padding: 20,
    borderWidth: 1.5, borderColor: '#AED6F1',
  },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: '#1A5276', marginBottom: 8 },
  ctaText: { fontSize: 14, color: '#2C3E50', lineHeight: 22, marginBottom: 14 },
  ctaBtn: {
    backgroundColor: '#1A5276', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  ctaBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
