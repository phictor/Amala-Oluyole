import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppStore } from '@/lib/store/app-store';
import { Image as ExpoImage } from 'expo-image';

const LOGO_CHEF = require('@/assets/images/logo-chef.png');
const LOGO_FULL = require('@/assets/images/logo-full.png');

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Authentic Nigerian Flavours',
    subtitle: 'Experience the rich taste of traditional Yoruba cuisine from Amala Oluyole — Ibadan\'s favourite restaurant.',
    emoji: '🍲',
    bg: '#C0392B',
  },
  {
    id: '2',
    title: 'Build Your Perfect Meal',
    subtitle: 'Choose your swallow, soup, protein and extras. Customise every bite exactly the way you like it.',
    emoji: '👨‍🍳',
    bg: '#6B3A2A',
  },
  {
    id: '3',
    title: 'Fast Delivery & Easy Pickup',
    subtitle: 'Order from the nearest branch and track your delivery in real time. Hot food, right to your door.',
    emoji: '🛵',
    bg: '#F39C12',
  },
];

export default function OnboardingScreen() {
  const { dispatch } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      dispatch({ type: 'SET_ONBOARDING_SEEN' });
      router.replace('/auth/login' as never);
    }
  };

  const handleSkip = () => {
    dispatch({ type: 'SET_ONBOARDING_SEEN' });
    router.replace('/auth/login' as never);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg, width }]}>
            <View style={styles.emojiContainer}>
              {item.id === '1'
                ? <ExpoImage source={LOGO_CHEF} style={styles.logoImg} contentFit="contain" />
                : <Text style={styles.emoji}>{item.emoji}</Text>
              }
            </View>
            {item.id === '1' && (
              <ExpoImage source={LOGO_FULL} style={styles.logoFull} contentFit="contain" />
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#C0392B' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emojiContainer: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 40,
  },
  emoji: { fontSize: 80 },
  logoImg: { width: 140, height: 140 },
  logoFull: { width: 220, height: 80, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#FFF', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  footer: { backgroundColor: '#FDF8F3', paddingVertical: 32, paddingHorizontal: 24, alignItems: 'center' },
  dots: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8D5C4' },
  dotActive: { width: 24, backgroundColor: '#C0392B' },
  nextBtn: {
    backgroundColor: '#C0392B', borderRadius: 16, paddingVertical: 16,
    paddingHorizontal: 48, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  nextBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  nextBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: '#8B6F5E', fontSize: 16 },
});
