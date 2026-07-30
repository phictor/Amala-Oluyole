import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Dimensions, Alert, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';

const { width: W } = Dimensions.get('window');

type EventCategory = 'all' | 'cultural' | 'music' | 'private' | 'food';

const EVENT_CATEGORIES: { id: EventCategory; label: string; emoji: string }[] = [
  { id: 'all', label: 'All Events', emoji: '🎭' },
  { id: 'cultural', label: 'Cultural', emoji: '🥁' },
  { id: 'music', label: 'Live Music', emoji: '🎵' },
  { id: 'food', label: 'Food Festival', emoji: '🍲' },
  { id: 'private', label: 'Private', emoji: '🔒' },
];

interface EventItem {
  id: string;
  category: EventCategory;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  emoji: string;
  gradient: readonly [string, string];
  spotsLeft: number | null;
  description: string;
  highlights: string[];
}

const EVENTS: EventItem[] = [
  {
    id: 'e1',
    category: 'cultural',
    title: 'Yoruba Cultural Night',
    subtitle: 'A celebration of Yoruba heritage, food and music',
    date: 'Sat, 9 Aug 2026',
    time: '6:00 PM – 10:00 PM',
    venue: 'Amala Oluyole Main Branch',
    price: '₦5,000 per person',
    emoji: '🥁',
    gradient: ['#7B241C', '#4A1511'] as const,
    spotsLeft: 24,
    description: 'An immersive evening celebrating Yoruba culture with traditional music, dance, storytelling and an exclusive Yoruba feast curated by our head chef.',
    highlights: ['Traditional Yoruba feast', 'Live Talking Drum performance', 'Aso-Oke dress code encouraged', 'Complimentary Chapman on arrival'],
  },
  {
    id: 'e2',
    category: 'music',
    title: 'Jazz & Amala Night',
    subtitle: 'Live jazz with our signature swallow menu',
    date: 'Fri, 15 Aug 2026',
    time: '7:00 PM – 11:00 PM',
    venue: 'Amala Oluyole Bistro',
    price: '₦3,500 per person',
    emoji: '🎷',
    gradient: ['#1A5276', '#0E3460'] as const,
    spotsLeft: 12,
    description: 'Unwind on a Friday evening with smooth jazz from our resident band while enjoying our full swallow menu and bistro cocktails.',
    highlights: ['Live jazz band', 'Full swallow & soup menu', 'Bistro cocktail bar open', 'Reservations strongly advised'],
  },
  {
    id: 'e3',
    category: 'food',
    title: 'Ibadan Food Festival',
    subtitle: 'The best of Ibadan cuisine under one roof',
    date: 'Sun, 24 Aug 2026',
    time: '12:00 PM – 8:00 PM',
    venue: 'Amala Oluyole Outdoor Grounds',
    price: 'Free entry · Food purchased separately',
    emoji: '🍲',
    gradient: ['#1E8449', '#145A32'] as const,
    spotsLeft: null,
    description: 'A day-long open-air celebration of Ibadan\'s rich food culture. Featuring over 20 food stalls, cooking demonstrations, and live entertainment.',
    highlights: ['20+ food stalls', 'Live cooking demos', 'Children\'s corner', 'Free entry'],
  },
  {
    id: 'e4',
    category: 'music',
    title: 'Afrobeats Brunch',
    subtitle: 'Sunday brunch with live Afrobeats',
    date: 'Sun, 31 Aug 2026',
    time: '11:00 AM – 3:00 PM',
    venue: 'Amala Oluyole Fine Dining',
    price: '₦8,000 per person (inclusive)',
    emoji: '🎶',
    gradient: ['#7D3C98', '#4A235A'] as const,
    spotsLeft: 8,
    description: 'A premium Sunday brunch experience with a live Afrobeats band, a three-course brunch menu and free-flow cocktails for the first hour.',
    highlights: ['3-course brunch menu', 'Live Afrobeats band', 'Free-flow cocktails (1 hr)', 'Limited seats — book early'],
  },
  {
    id: 'e5',
    category: 'private',
    title: 'Private Event Hire',
    subtitle: 'Birthday · Corporate · Wedding reception',
    date: 'Available year-round',
    time: 'Flexible',
    venue: 'Any Amala Oluyole venue',
    price: 'Custom quote',
    emoji: '🎊',
    gradient: ['#B7950B', '#7D6608'] as const,
    spotsLeft: null,
    description: 'Host your private event at Amala Oluyole. We cater for birthdays, corporate dinners, wedding receptions, and more. Our events team will handle everything.',
    highlights: ['Dedicated events coordinator', 'Custom menu planning', 'Décor & setup included', 'Capacity: 20 – 300 guests'],
  },
];

function EventCard({ event, onPress }: { event: EventItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.eventCard} onPress={onPress} activeOpacity={0.88}>
      <LinearGradient colors={event.gradient} style={s.eventCardGrad}>
        <View style={s.eventCardTop}>
          <Text style={s.eventEmoji}>{event.emoji}</Text>
          {event.spotsLeft !== null && event.spotsLeft <= 15 && (
            <View style={s.urgencyBadge}>
              <Text style={s.urgencyText}>Only {event.spotsLeft} spots left!</Text>
            </View>
          )}
        </View>
        <Text style={s.eventTitle}>{event.title}</Text>
        <Text style={s.eventSubtitle}>{event.subtitle}</Text>
        <View style={s.eventMeta}>
          <Text style={s.eventMetaText}>📅 {event.date}</Text>
          <Text style={s.eventMetaText}>🕐 {event.time}</Text>
          <Text style={s.eventMetaText}>📍 {event.venue}</Text>
        </View>
        <View style={s.eventFooter}>
          <Text style={s.eventPrice}>{event.price}</Text>
          <View style={s.bookBtn}>
            <Text style={s.bookBtnText}>Book Now →</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function EventDetailSheet({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const handleBook = () => {
    if (event.category === 'private') {
      Linking.openURL('mailto:events@amalaoluyole.com?subject=Private Event Enquiry');
    } else {
      Alert.alert(
        `Book: ${event.title}`,
        `Date: ${event.date}\nTime: ${event.time}\nVenue: ${event.venue}\nPrice: ${event.price}\n\nTo complete your booking, please call or WhatsApp us.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call Us', onPress: () => Linking.openURL('tel:+2348030000001') },
          { text: 'WhatsApp', onPress: () => Linking.openURL('https://wa.me/2348030000001?text=I%20want%20to%20book%20' + encodeURIComponent(event.title)) },
        ],
      );
    }
  };

  return (
    <View style={s.sheetOverlay}>
      <TouchableOpacity style={s.sheetBackdrop} onPress={onClose} activeOpacity={1} />
      <View style={s.sheet}>
        <LinearGradient colors={event.gradient} style={s.sheetHeader}>
          <Text style={s.sheetEmoji}>{event.emoji}</Text>
          <Text style={s.sheetTitle}>{event.title}</Text>
          <Text style={s.sheetSubtitle}>{event.subtitle}</Text>
        </LinearGradient>
        <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
          <View style={s.sheetMetaRow}>
            <View style={s.sheetMetaItem}><Text style={s.sheetMetaLabel}>Date</Text><Text style={s.sheetMetaValue}>{event.date}</Text></View>
            <View style={s.sheetMetaItem}><Text style={s.sheetMetaLabel}>Time</Text><Text style={s.sheetMetaValue}>{event.time}</Text></View>
          </View>
          <View style={s.sheetMetaRow}>
            <View style={s.sheetMetaItem}><Text style={s.sheetMetaLabel}>Venue</Text><Text style={s.sheetMetaValue}>{event.venue}</Text></View>
            <View style={s.sheetMetaItem}><Text style={s.sheetMetaLabel}>Price</Text><Text style={s.sheetMetaValue}>{event.price}</Text></View>
          </View>
          <Text style={s.sheetDesc}>{event.description}</Text>
          <Text style={s.sheetHighlightsTitle}>What to expect</Text>
          {event.highlights.map((h, i) => (
            <View key={i} style={s.highlightRow}>
              <Text style={s.highlightDot}>✓</Text>
              <Text style={s.highlightText}>{h}</Text>
            </View>
          ))}
          {event.spotsLeft !== null && (
            <View style={s.spotsRow}>
              <Text style={s.spotsText}>⚡ {event.spotsLeft} spots remaining</Text>
            </View>
          )}
          <TouchableOpacity style={s.sheetBookBtn} onPress={handleBook} activeOpacity={0.85}>
            <Text style={s.sheetBookBtnText}>
              {event.category === 'private' ? '✉️  Send Enquiry' : '🎟️  Book Your Seat'}
            </Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </View>
  );
}

export default function EventsScreen() {
  const [activeCategory, setActiveCategory] = useState<EventCategory>('all');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const filtered = activeCategory === 'all'
    ? EVENTS
    : EVENTS.filter(e => e.category === activeCategory);

  return (
    <ScreenContainer edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {selectedEvent && (
        <EventDetailSheet event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* Header */}
        <LinearGradient colors={['#7D3C98', '#4A235A', '#2C1A3A']} style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={s.headerContent}>
            <Text style={s.headerEmoji}>🎉</Text>
            <Text style={s.headerTitle}>Events at Amala Oluyole</Text>
            <Text style={s.headerSub}>Cultural nights · Live music · Food festivals · Private hire</Text>
          </View>
        </LinearGradient>

        {/* Category Filter */}
        <View style={s.catSection}>
          <FlatList
            data={EVENT_CATEGORIES}
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

        {/* Events List */}
        <View style={s.list}>
          {filtered.map(event => (
            <EventCard key={event.id} event={event} onPress={() => setSelectedEvent(event)} />
          ))}
        </View>

        {/* Private Event CTA */}
        <TouchableOpacity
          style={s.privateCta}
          onPress={() => setSelectedEvent(EVENTS.find(e => e.id === 'e5')!)}
          activeOpacity={0.85}
        >
          <Text style={s.privateCtaTitle}>🎊 Host a Private Event</Text>
          <Text style={s.privateCtaText}>Birthdays · Corporates · Wedding Receptions · Celebrations</Text>
          <Text style={s.privateCtaLink}>Get a custom quote →</Text>
        </TouchableOpacity>

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
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },

  catSection: { marginTop: 16, marginBottom: 4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F4F3FB', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipActive: { backgroundColor: '#7D3C98', borderColor: '#7D3C98' },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#201060' },
  catLabelActive: { color: '#FFF' },

  list: { paddingHorizontal: 16, gap: 14, marginTop: 12 },

  eventCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 2 },
  eventCardGrad: { padding: 20 },
  eventCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  eventEmoji: { fontSize: 40 },
  urgencyBadge: { backgroundColor: '#F39C12', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  urgencyText: { fontSize: 11, fontWeight: '800', color: '#FFF' },
  eventTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', marginBottom: 4 },
  eventSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 12, lineHeight: 19 },
  eventMeta: { gap: 4, marginBottom: 14 },
  eventMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  eventFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventPrice: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  bookBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  bookBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },

  privateCta: {
    margin: 16, marginTop: 8,
    backgroundColor: '#FEF9E7', borderRadius: 18, padding: 20,
    borderWidth: 1.5, borderColor: '#F0C000',
  },
  privateCtaTitle: { fontSize: 18, fontWeight: '800', color: '#7D6608', marginBottom: 6 },
  privateCtaText: { fontSize: 13, color: '#5D4E37', lineHeight: 20, marginBottom: 8 },
  privateCtaLink: { fontSize: 14, fontWeight: '700', color: '#B7950B' },

  // Detail Sheet
  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', overflow: 'hidden',
  },
  sheetHeader: { padding: 24, alignItems: 'center', gap: 6 },
  sheetEmoji: { fontSize: 44, marginBottom: 4 },
  sheetTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  sheetSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  sheetBody: { padding: 20 },
  sheetMetaRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sheetMetaItem: { flex: 1, backgroundColor: '#F4F3FB', borderRadius: 12, padding: 12 },
  sheetMetaLabel: { fontSize: 10, fontWeight: '700', color: '#9B94C4', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  sheetMetaValue: { fontSize: 13, fontWeight: '700', color: '#201060', lineHeight: 18 },
  sheetDesc: { fontSize: 14, color: '#2C3E50', lineHeight: 22, marginBottom: 16 },
  sheetHighlightsTitle: { fontSize: 15, fontWeight: '800', color: '#201060', marginBottom: 10 },
  highlightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  highlightDot: { fontSize: 16, color: '#27AE60', fontWeight: '700', marginTop: 1 },
  highlightText: { flex: 1, fontSize: 14, color: '#2C3E50', lineHeight: 20 },
  spotsRow: {
    backgroundColor: '#FEF9E7', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 8,
    borderWidth: 1, borderColor: '#F0C000',
  },
  spotsText: { fontSize: 14, fontWeight: '700', color: '#7D6608', textAlign: 'center' },
  sheetBookBtn: {
    backgroundColor: '#7D3C98', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 14,
  },
  sheetBookBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
});
