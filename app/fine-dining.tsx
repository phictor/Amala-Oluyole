import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Dimensions, Alert, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { Image } from 'expo-image';

const { width: W } = Dimensions.get('window');

const MENU_CATEGORIES = [
  { id: 'all', label: 'Full Menu', emoji: '🍽️' },
  { id: 'starters', label: 'Starters', emoji: '🥗' },
  { id: 'mains', label: 'Main Course', emoji: '🍲' },
  { id: 'protein', label: 'Premium Proteins', emoji: '🥩' },
  { id: 'desserts', label: 'Desserts', emoji: '🍮' },
  { id: 'drinks', label: 'Drinks', emoji: '🍷' },
];

interface MenuItem {
  id: string;
  category: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  badge: string | null;
  allergens?: string;
}

const FINE_DINING_MENU: MenuItem[] = [
  // Starters
  { id: 'fd1', category: 'starters', name: 'Peppered Snail', description: 'Giant African snails in a rich tomato and pepper sauce with herbs. Served with toasted agege bread.', price: 4500, emoji: '🐌', badge: "Chef's Signature" },
  { id: 'fd2', category: 'starters', name: 'Ofe Akwu Bisque', description: 'Velvety palm nut bisque with a swirl of coconut cream and crispy plantain croutons.', price: 3800, emoji: '🥣', badge: 'Vegetarian' },
  { id: 'fd3', category: 'starters', name: 'Suya Tartare', description: 'Finely diced suya-spiced beef tenderloin, capers, egg yolk and yaji oil. Served with plantain crisps.', price: 5200, emoji: '🥩', badge: 'New' },
  { id: 'fd4', category: 'starters', name: 'Moi Moi Terrine', description: 'Silky steamed bean pudding layered with smoked fish, prawns and egg. Served with a pepper coulis.', price: 3500, emoji: '🫕', badge: null },

  // Mains
  { id: 'fd5', category: 'mains', name: 'Signature Amala & Ewedu', description: 'Our finest yam flour amala, hand-pounded to order, with silky ewedu soup and gbegiri. Served with your choice of protein.', price: 8500, emoji: '🍲', badge: 'House Specialty' },
  { id: 'fd6', category: 'mains', name: 'Oha Soup & Eba', description: 'Slow-cooked oha leaf soup with assorted meats, stockfish and crayfish. Served with golden eba.', price: 7800, emoji: '🥬', badge: null },
  { id: 'fd7', category: 'mains', name: 'Egusi Royale', description: 'Stone-ground egusi cooked with palm oil, iru and assorted meats. Served with pounded yam made to order.', price: 9000, emoji: '🌿', badge: 'Most Ordered' },
  { id: 'fd8', category: 'mains', name: 'Banga Soup & Starch', description: 'Delta-style palm nut soup with orobo, periwinkle and dried fish. Served with starch.', price: 8200, emoji: '🫙', badge: null },
  { id: 'fd9', category: 'mains', name: 'Afang & Semovita', description: 'Afang leaves and waterleaf cooked with palm oil, stockfish and assorted meats. Served with semovita.', price: 8000, emoji: '🌱', badge: null },

  // Premium Proteins
  { id: 'fd10', category: 'protein', name: 'Whole Grilled Tilapia', description: 'Fresh tilapia marinated in suya spice, grilled over charcoal and served with jollof rice and coleslaw.', price: 12000, emoji: '🐟', badge: 'Grilled' },
  { id: 'fd11', category: 'protein', name: 'Oxtail Stew', description: 'Slow-braised oxtail in a rich tomato and pepper stew, served with white rice and fried plantain.', price: 15000, emoji: '🦴', badge: "Chef's Pick" },
  { id: 'fd12', category: 'protein', name: 'Peppered Goat Meat', description: 'Tender goat meat slow-cooked with scotch bonnet, tomatoes and Yoruba spices. Served with agege bread.', price: 11000, emoji: '🐐', badge: 'Spicy' },
  { id: 'fd13', category: 'protein', name: 'Jumbo Prawns', description: 'Tiger prawns in a spiced butter and garlic sauce, served with jollof rice and a side salad.', price: 18000, emoji: '🦐', badge: 'Premium', allergens: 'Shellfish' },
  { id: 'fd14', category: 'protein', name: 'Assorted Meat Platter', description: 'A generous selection of ponmo, shaki, bokoto and beef, peppered and served with agege bread.', price: 9500, emoji: '🍖', badge: null },

  // Desserts
  { id: 'fd15', category: 'desserts', name: 'Puff Puff Soufflé', description: 'Elevated puff puff batter baked into a light soufflé, dusted with cinnamon sugar and served with vanilla cream.', price: 3200, emoji: '🍮', badge: "Chef's Signature" },
  { id: 'fd16', category: 'desserts', name: 'Coconut Panna Cotta', description: 'Silky coconut milk panna cotta with a mango coulis and toasted coconut flakes.', price: 2800, emoji: '🥥', badge: null },
  { id: 'fd17', category: 'desserts', name: 'Chin Chin Crumble', description: 'Warm chin chin crumble with caramel sauce and a scoop of vanilla ice cream.', price: 2500, emoji: '🍨', badge: 'New' },

  // Drinks
  { id: 'fd18', category: 'drinks', name: 'Premium Chapman', description: 'Our fine dining take on the classic Chapman — Campari, Fanta, Sprite, cucumber, orange and a cherry.', price: 3500, emoji: '🍊', badge: 'Signature' },
  { id: 'fd19', category: 'drinks', name: 'Aged Palm Wine', description: 'Carefully selected aged palm wine, served chilled in a crystal glass.', price: 4000, emoji: '🍶', badge: 'Local' },
  { id: 'fd20', category: 'drinks', name: 'Hibiscus Spritz', description: 'Zobo concentrate, sparkling water, ginger syrup and a twist of lime. Non-alcoholic.', price: 2800, emoji: '🌺', badge: null },
];

const AMBIANCE = [
  { emoji: '🕯️', title: 'Candlelit Setting', desc: 'Intimate tables with soft candlelight and curated Nigerian art on the walls.' },
  { emoji: '🎵', title: 'Live Music', desc: 'Live jazz or Afrobeats on Friday and Saturday evenings from 7 PM.' },
  { emoji: '👨‍🍳', title: 'Chef\'s Table', desc: 'Book the exclusive chef\'s table for a personalised tasting menu experience.' },
  { emoji: '🌿', title: 'Private Dining Room', desc: 'A secluded room for up to 12 guests — ideal for corporate dinners and celebrations.' },
];

export default function FineDiningScreen() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = activeCategory === 'all'
    ? FINE_DINING_MENU
    : FINE_DINING_MENU.filter(i => i.category === activeCategory);

  const handleReserve = () => {
    Alert.alert(
      'Reserve a Table',
      'To make a reservation at Amala Oluyole Fine Dining, please call us or use the Reservations screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Us', onPress: () => Linking.openURL('tel:+2348030000003') },
        { text: 'Reserve Online', onPress: () => router.push('/reservation' as never) },
      ],
    );
  };

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <LinearGradient colors={['#2C1A0E', '#5D3A1A', '#7B4A2A']} style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={s.headerContent}>
            <Text style={s.headerEmoji}>🍽️</Text>
            <Text style={s.headerTitle}>Fine Dining</Text>
            <Text style={s.headerRestaurant}>Amala Oluyole</Text>
            <Text style={s.headerSub}>An elevated Nigerian dining experience</Text>
            <View style={s.headerMeta}>
              <Text style={s.headerMetaText}>⭐ 4.9 · 📍 Oluyole, Ibadan · Tue–Sun 12–10 PM</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Reserve CTA */}
        <TouchableOpacity style={s.reserveCta} onPress={handleReserve} activeOpacity={0.85}>
          <LinearGradient colors={['#7B241C', '#4A1511']} style={s.reserveCtaGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={s.reserveCtaLeft}>
              <Text style={s.reserveCtaTitle}>Reserve Your Table</Text>
              <Text style={s.reserveCtaSub}>Recommended · Dress code: Smart casual</Text>
            </View>
            <View style={s.reserveCtaArrow}>
              <Text style={s.reserveCtaArrowText}>›</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Tasting Menu */}
        <View style={s.tastingSection}>
          <View style={s.tastingImageContainer}>
            <Image
              source="/manus-storage/fine-dining-tasting_c871be05.jpg"
              style={s.tastingImage}
              contentFit="cover"
              transition={400}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)', 'rgba(0,0,0,0.92)']}
              style={s.tastingImageOverlay}
            />
            <View style={s.tastingImageContent}>
              <View style={s.tastingBadge}>
                <Text style={s.tastingBadgeText}>CHEF'S TASTING MENU</Text>
              </View>
              <Text style={s.tastingTitle}>5-Course Set Menu</Text>
              <Text style={s.tastingPrice}>₦25,000 per person</Text>
            </View>
          </View>
          <View style={s.tastingBody}>
            <Text style={s.tastingDesc}>
              An immersive journey through the finest flavours of Nigerian cuisine, curated by our head chef.
              Each course is thoughtfully paired with a complementary drink.
            </Text>
            <View style={s.tastingCourses}>
              {[
                { num: '01', label: 'Amuse-bouche', dish: 'Peppered Snail on Plantain Crisp' },
                { num: '02', label: 'Starter', dish: 'Ofe Akwu Bisque with Coconut Cream' },
                { num: '03', label: 'Fish Course', dish: 'Suya-Spiced Grilled Tilapia' },
                { num: '04', label: 'Main', dish: 'Signature Amala & Ewedu with Assorted Protein' },
                { num: '05', label: 'Dessert', dish: 'Puff Puff Soufflé with Vanilla Cream' },
              ].map(course => (
                <View key={course.num} style={s.tastingCourseRow}>
                  <View style={s.tastingCourseNum}>
                    <Text style={s.tastingCourseNumText}>{course.num}</Text>
                  </View>
                  <View style={s.tastingCourseInfo}>
                    <Text style={s.tastingCourseLabel}>{course.label}</Text>
                    <Text style={s.tastingCourseDish}>{course.dish}</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={s.tastingCta}
              onPress={() => Alert.alert(
                'Book Tasting Menu',
                'The 5-course tasting menu is available Tuesday to Sunday from 12 PM. Advance booking required.\n\nPrice: ₦25,000 per person (inclusive of service charge).',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call to Book', onPress: () => Linking.openURL('tel:+2348030000003') },
                  { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/2348030000003?text=I%20want%20to%20book%20the%20Tasting%20Menu') },
                ],
              )}
              activeOpacity={0.85}
            >
              <Text style={s.tastingCtaText}>🍽️ Book Tasting Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ambiance */}
        <View style={s.sectionPadded}>
          <Text style={s.sectionTitle}>The Experience</Text>
          <View style={s.ambianceGrid}>
            {AMBIANCE.map((a, i) => (
              <View key={i} style={s.ambianceCard}>
                <Text style={s.ambianceEmoji}>{a.emoji}</Text>
                <Text style={s.ambianceTitle}>{a.title}</Text>
                <Text style={s.ambianceDesc}>{a.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Menu */}
        <View style={s.sectionPadded}>
          <Text style={s.sectionTitle}>Our Menu</Text>
          <Text style={s.sectionSub}>All prices in Nigerian Naira (₦). Service charge of 10% applies.</Text>
        </View>

        {/* Category Filter */}
        <FlatList
          data={MENU_CATEGORIES}
          keyExtractor={c => c.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}
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

        {/* Menu Items */}
        <View style={s.menuList}>
          {filtered.map(item => (
            <View key={item.id} style={s.menuItem}>
              <View style={s.menuItemLeft}>
                <Text style={s.menuItemEmoji}>{item.emoji}</Text>
              </View>
              <View style={s.menuItemBody}>
                <View style={s.menuItemTitleRow}>
                  <Text style={s.menuItemName}>{item.name}</Text>
                  {item.badge && (
                    <View style={[s.badge, item.badge === "Chef's Signature" && s.badgeGold]}>
                      <Text style={s.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.menuItemDesc}>{item.description}</Text>
                {item.allergens && (
                  <Text style={s.allergen}>⚠️ Contains: {item.allergens}</Text>
                )}
                <Text style={s.menuItemPrice}>₦{item.price.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Footer note */}
        <View style={s.footerNote}>
          <Text style={s.footerNoteText}>
            Our menu changes seasonally. Please inform your server of any dietary requirements or allergies.
            A 10% service charge is added to all bills.
          </Text>
          <TouchableOpacity style={s.reserveFooterBtn} onPress={handleReserve} activeOpacity={0.85}>
            <Text style={s.reserveFooterBtnText}>🍽️ Reserve a Table</Text>
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
  headerContent: { alignItems: 'center', gap: 4 },
  headerEmoji: { fontSize: 48, marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  headerRestaurant: { fontSize: 14, color: '#F0C000', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 4 },
  headerMeta: {
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  headerMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  reserveCta: { margin: 16, borderRadius: 16, overflow: 'hidden' },
  reserveCtaGrad: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  reserveCtaLeft: { flex: 1 },
  reserveCtaTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  reserveCtaSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  reserveCtaArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  reserveCtaArrowText: { fontSize: 22, color: '#FFF', fontWeight: '700' },

  tastingSection: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1.5, borderColor: '#D4AF37',
  },
  tastingImageContainer: { height: 200, position: 'relative' },
  tastingImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tastingImageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  tastingImageContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  tastingBadge: {
    alignSelf: 'flex-start', backgroundColor: '#D4AF37',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8,
  },
  tastingBadgeText: { fontSize: 10, fontWeight: '900', color: '#2C1A0E', letterSpacing: 1 },
  tastingTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  tastingPrice: { fontSize: 16, fontWeight: '700', color: '#D4AF37' },
  tastingBody: { backgroundColor: '#FDF9F0', padding: 20 },
  tastingDesc: { fontSize: 13, color: '#5D3A1A', lineHeight: 21, marginBottom: 16 },
  tastingCourses: { gap: 12, marginBottom: 20 },
  tastingCourseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tastingCourseNum: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#2C1A0E', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  tastingCourseNumText: { fontSize: 11, fontWeight: '900', color: '#D4AF37' },
  tastingCourseInfo: { flex: 1 },
  tastingCourseLabel: { fontSize: 11, fontWeight: '700', color: '#7B4A2A', textTransform: 'uppercase', letterSpacing: 0.5 },
  tastingCourseDish: { fontSize: 14, fontWeight: '600', color: '#2C1A0E', marginTop: 1 },
  tastingCta: {
    backgroundColor: '#2C1A0E', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  tastingCtaText: { fontSize: 15, fontWeight: '800', color: '#D4AF37' },

  sectionPadded: { paddingHorizontal: 16, marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#201060', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#6B6490', lineHeight: 18 },

  ambianceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  ambianceCard: {
    width: (W - 44) / 2,
    backgroundColor: '#FDF9F0', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F0E6C8',
  },
  ambianceEmoji: { fontSize: 28, marginBottom: 6 },
  ambianceTitle: { fontSize: 13, fontWeight: '800', color: '#201060', marginBottom: 4 },
  ambianceDesc: { fontSize: 11, color: '#6B6490', lineHeight: 16 },

  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F4F3FB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipActive: { backgroundColor: '#7B241C', borderColor: '#7B241C' },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#201060' },
  catLabelActive: { color: '#FFF' },

  menuList: { paddingHorizontal: 16, gap: 0 },
  menuItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0EEF8',
  },
  menuItemLeft: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#FDF9F0', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#F0E6C8',
  },
  menuItemEmoji: { fontSize: 26 },
  menuItemBody: { flex: 1 },
  menuItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  menuItemName: { fontSize: 15, fontWeight: '800', color: '#201060' },
  badge: { backgroundColor: '#D02010', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeGold: { backgroundColor: '#B7950B' },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  menuItemDesc: { fontSize: 12, color: '#6B6490', lineHeight: 18, marginBottom: 6 },
  allergen: { fontSize: 11, color: '#E67E22', fontWeight: '600', marginBottom: 4 },
  menuItemPrice: { fontSize: 15, fontWeight: '800', color: '#7B241C' },

  footerNote: {
    margin: 16, marginTop: 20,
    backgroundColor: '#FDF9F0', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: '#F0E6C8',
  },
  footerNoteText: { fontSize: 13, color: '#5D4E37', lineHeight: 20, marginBottom: 14, textAlign: 'justify' },
  reserveFooterBtn: {
    backgroundColor: '#7B241C', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  reserveFooterBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
});
