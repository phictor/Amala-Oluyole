import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '@/lib/store/app-store';
import {
  SWALLOW_OPTIONS, SOUP_OPTIONS, PROTEIN_OPTIONS, EXTRA_OPTIONS,
} from '@/lib/data/mock-data';
import type { SwallowOption, SoupOption, ProteinOption, ExtraOption, CartItem, CustomMeal } from '@/lib/data/types';

const STEPS = ['Swallow', 'Soup', 'Protein', 'Extras'];
const BASE_PRICE = 1500;
const APP_DEEP_LINK_BASE = 'https://amalaoluyole.com/meal/custom';

/** Encodes a custom meal into a shareable URL query string */
function buildShareLink(
  swallow: SwallowOption,
  soup: SoupOption,
  proteins: ProteinOption[],
  extras: ExtraOption[],
  price: number,
): string {
  const params = new URLSearchParams({
    sw: swallow.name,
    so: soup.name,
    pr: proteins.map(p => p.name).join(','),
    ex: extras.map(e => e.name).join(','),
    price: String(price),
  });
  return `${APP_DEEP_LINK_BASE}?${params.toString()}`;
}

/** Builds a human-readable share message */
function buildShareMessage(
  swallow: SwallowOption,
  soup: SoupOption,
  proteins: ProteinOption[],
  extras: ExtraOption[],
  price: number,
): string {
  const proteinList = proteins.map(p => p.name).join(' + ');
  const extrasList = extras.length > 0 ? `\nExtras: ${extras.map(e => e.name).join(', ')}` : '';
  const link = buildShareLink(swallow, soup, proteins, extras, price);
  return (
    `🍲 Check out my custom Amala Oluyole meal!\n\n` +
    `🫓 Swallow: ${swallow.name}\n` +
    `🥣 Soup: ${soup.name}\n` +
    `🍗 Protein: ${proteinList}${extrasList}\n` +
    `💰 Total: ₦${price.toLocaleString()}\n\n` +
    `Build yours at Amala Oluyole 👇\n${link}`
  );
}

export default function MealBuilderScreen() {
  const { dispatch } = useAppStore();
  const [step, setStep] = useState(0);
  const [selectedSwallow, setSelectedSwallow] = useState<SwallowOption | null>(null);
  const [selectedSoup, setSelectedSoup] = useState<SoupOption | null>(null);
  const [selectedProteins, setSelectedProteins] = useState<ProteinOption[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<ExtraOption[]>([]);
  const [instructions, setInstructions] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const totalPrice = BASE_PRICE +
    (selectedSwallow?.price || 0) +
    (selectedSoup?.price || 0) +
    selectedProteins.reduce((sum, p) => sum + p.price, 0) +
    selectedExtras.reduce((sum, e) => sum + e.price, 0);

  const toggleProtein = (protein: ProteinOption) => {
    if (selectedProteins.find(p => p.id === protein.id)) {
      setSelectedProteins(selectedProteins.filter(p => p.id !== protein.id));
    } else {
      setSelectedProteins([...selectedProteins, protein]);
    }
  };

  const toggleExtra = (extra: ExtraOption) => {
    if (selectedExtras.find(e => e.id === extra.id)) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const canProceed = () => {
    if (step === 0) return selectedSwallow !== null;
    if (step === 1) return selectedSoup !== null;
    if (step === 2) return selectedProteins.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleAddToCart();
    }
  };

  const handleAddToCart = () => {
    if (!selectedSwallow || !selectedSoup || selectedProteins.length === 0) {
      Alert.alert('Incomplete', 'Please select swallow, soup, and at least one protein.');
      return;
    }
    const customMeal: CustomMeal = {
      swallow: selectedSwallow,
      soup: selectedSoup,
      protein: selectedProteins,
      extras: selectedExtras,
      specialInstructions: instructions || undefined,
      totalPrice,
    };
    const cartItem: CartItem = {
      id: `builder-${Date.now()}`,
      customMeal,
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice,
    };
    dispatch({ type: 'ADD_TO_CART', payload: cartItem });
    Alert.alert('Added to Cart! 🎉', 'Your custom meal has been added to your cart.', [
      {
        text: 'Build Another',
        onPress: () => {
          setStep(0);
          setSelectedSwallow(null);
          setSelectedSoup(null);
          setSelectedProteins([]);
          setSelectedExtras([]);
          setLinkCopied(false);
        },
      },
      { text: 'View Cart', onPress: () => router.push('/(tabs)/cart' as never) },
    ]);
  };

  /** Opens the native OS share sheet with the meal description + link */
  const handleShare = async () => {
    if (!selectedSwallow || !selectedSoup || selectedProteins.length === 0) {
      Alert.alert('Almost there!', 'Please complete at least swallow, soup, and protein before sharing.');
      return;
    }
    const message = buildShareMessage(selectedSwallow, selectedSoup, selectedProteins, selectedExtras, totalPrice);

    if (Platform.OS === 'web') {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        // Fallback: copy to clipboard on web
        await Clipboard.setStringAsync(message);
        Alert.alert('Copied!', 'Your meal details have been copied to the clipboard.');
        return;
      }
    }

    try {
      // expo-sharing only shares files; for text we write a temp .txt file and share it
      // On native, use React Native's built-in Share API for text sharing
      const { Share } = await import('react-native');
      await Share.share({
        message,
        title: 'My Custom Amala Oluyole Meal',
      });
    } catch (err) {
      // Fallback to clipboard
      await Clipboard.setStringAsync(message);
      Alert.alert('Copied!', 'Sharing is not available. Your meal details were copied to the clipboard instead.');
    }
  };

  /** Copies the deep link URL to clipboard */
  const handleCopyLink = async () => {
    if (!selectedSwallow || !selectedSoup || selectedProteins.length === 0) {
      Alert.alert('Almost there!', 'Please complete at least swallow, soup, and protein before copying a link.');
      return;
    }
    const link = buildShareLink(selectedSwallow, selectedSoup, selectedProteins, selectedExtras, totalPrice);
    await Clipboard.setStringAsync(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const isShareable = !!(selectedSwallow && selectedSoup && selectedProteins.length > 0);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Build Your Meal</Text>
        <Text style={styles.subtitle}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.progressStep}>
            <View style={[styles.progressDot, i <= step && styles.progressDotActive]}>
              <Text style={[styles.progressDotText, i <= step && styles.progressDotTextActive]}>
                {i < step ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[styles.progressLabel, i <= step && styles.progressLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      {/* Price Bar */}
      <View style={styles.priceBar}>
        <Text style={styles.priceBarLabel}>Running Total</Text>
        <Text style={styles.priceBarValue}>₦{totalPrice.toLocaleString()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Step 1: Swallow */}
        {step === 0 && (
          <View>
            <Text style={styles.stepTitle}>Choose Your Swallow</Text>
            <Text style={styles.stepSubtitle}>Base price: ₦{BASE_PRICE.toLocaleString()}</Text>
            {SWALLOW_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, selectedSwallow?.id === option.id && styles.optionCardSelected, !option.isAvailable && styles.optionCardDisabled]}
                onPress={() => option.isAvailable && setSelectedSwallow(option)}
                disabled={!option.isAvailable}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionName}>{option.name}</Text>
                  {!option.isAvailable && <Text style={styles.unavailableText}>Not available today</Text>}
                </View>
                <View style={styles.optionRight}>
                  <Text style={styles.optionPrice}>{option.price > 0 ? `+₦${option.price}` : 'Included'}</Text>
                  {selectedSwallow?.id === option.id && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 2: Soup */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Choose Your Soup</Text>
            {SOUP_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionCard, selectedSoup?.id === option.id && styles.optionCardSelected, !option.isAvailable && styles.optionCardDisabled]}
                onPress={() => option.isAvailable && setSelectedSoup(option)}
                disabled={!option.isAvailable}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionName}>{option.name}</Text>
                  {!option.isAvailable && <Text style={styles.unavailableText}>Not available today</Text>}
                </View>
                <View style={styles.optionRight}>
                  <Text style={styles.optionPrice}>{option.price > 0 ? `+₦${option.price}` : 'Included'}</Text>
                  {selectedSoup?.id === option.id && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 3: Protein */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Choose Your Protein(s)</Text>
            <Text style={styles.stepSubtitle}>You can select multiple proteins</Text>
            {PROTEIN_OPTIONS.map(option => {
              const isSelected = selectedProteins.some(p => p.id === option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected, !option.isAvailable && styles.optionCardDisabled]}
                  onPress={() => option.isAvailable && toggleProtein(option)}
                  disabled={!option.isAvailable}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.optionNameRow}>
                      <Text style={styles.optionName}>{option.name}</Text>
                      {option.isPremium && <View style={styles.premiumBadge}><Text style={styles.premiumText}>Premium</Text></View>}
                    </View>
                    {!option.isAvailable && <Text style={styles.unavailableText}>Not available today</Text>}
                  </View>
                  <View style={styles.optionRight}>
                    <Text style={styles.optionPrice}>+₦{option.price}</Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 4: Extras + Share Card */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Add Extras (Optional)</Text>
            <Text style={styles.stepSubtitle}>Enhance your meal with add-ons</Text>
            {EXTRA_OPTIONS.map(option => {
              const isSelected = selectedExtras.some(e => e.id === option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => toggleExtra(option)}
                >
                  <Text style={styles.optionName}>{option.name}</Text>
                  <View style={styles.optionRight}>
                    <Text style={styles.optionPrice}>+₦{option.price}</Text>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* ── Share Your Creation Card ── */}
            <View style={styles.shareCard}>
              <Text style={styles.shareCardTitle}>🎉 Share Your Creation!</Text>
              <Text style={styles.shareCardSubtitle}>
                Let your friends know about your custom meal combo
              </Text>

              {/* Meal Summary Preview */}
              {selectedSwallow && selectedSoup && selectedProteins.length > 0 && (
                <View style={styles.mealSummary}>
                  <View style={styles.mealSummaryRow}>
                    <Text style={styles.mealSummaryIcon}>🫓</Text>
                    <Text style={styles.mealSummaryText}>{selectedSwallow.name}</Text>
                  </View>
                  <View style={styles.mealSummaryRow}>
                    <Text style={styles.mealSummaryIcon}>🥣</Text>
                    <Text style={styles.mealSummaryText}>{selectedSoup.name}</Text>
                  </View>
                  <View style={styles.mealSummaryRow}>
                    <Text style={styles.mealSummaryIcon}>🍗</Text>
                    <Text style={styles.mealSummaryText}>
                      {selectedProteins.map(p => p.name).join(' + ')}
                    </Text>
                  </View>
                  {selectedExtras.length > 0 && (
                    <View style={styles.mealSummaryRow}>
                      <Text style={styles.mealSummaryIcon}>➕</Text>
                      <Text style={styles.mealSummaryText}>
                        {selectedExtras.map(e => e.name).join(', ')}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.mealSummaryRow, styles.mealSummaryPriceRow]}>
                    <Text style={styles.mealSummaryIcon}>💰</Text>
                    <Text style={styles.mealSummaryPrice}>₦{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>
              )}

              {/* Share Buttons */}
              <View style={styles.shareButtonsRow}>
                {/* Share via native sheet */}
                <TouchableOpacity
                  style={[styles.shareBtn, !isShareable && styles.shareBtnDisabled]}
                  onPress={handleShare}
                  disabled={!isShareable}
                >
                  <Text style={styles.shareBtnIcon}>📤</Text>
                  <Text style={styles.shareBtnText}>Share</Text>
                </TouchableOpacity>

                {/* Copy link */}
                <TouchableOpacity
                  style={[styles.copyLinkBtn, linkCopied && styles.copyLinkBtnSuccess, !isShareable && styles.shareBtnDisabled]}
                  onPress={handleCopyLink}
                  disabled={!isShareable}
                >
                  <Text style={styles.shareBtnIcon}>{linkCopied ? '✅' : '🔗'}</Text>
                  <Text style={[styles.copyLinkBtnText, linkCopied && styles.copyLinkBtnTextSuccess]}>
                    {linkCopied ? 'Copied!' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!isShareable && (
                <Text style={styles.shareHint}>
                  Complete swallow, soup &amp; protein to unlock sharing
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        {step > 0 && (
          <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(step - 1)}>
            <Text style={styles.prevBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled, step === 0 && { flex: 1 }]}
          onPress={handleNext}
          disabled={!canProceed()}
        >
          <Text style={styles.nextBtnText}>
            {step === 3 ? `Add to Cart — ₦${totalPrice.toLocaleString()}` : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { color: '#C0392B', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A0F0A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8B6F5E' },
  progressRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 4 },
  progressStep: { flex: 1, alignItems: 'center', gap: 4 },
  progressDot: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E8D5C4',
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: '#C0392B' },
  progressDotText: { fontSize: 13, fontWeight: '700', color: '#8B6F5E' },
  progressDotTextActive: { color: '#FFF' },
  progressLabel: { fontSize: 10, color: '#8B6F5E', textAlign: 'center' },
  progressLabelActive: { color: '#C0392B', fontWeight: '700' },
  priceBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#6B3A2A', paddingHorizontal: 20, paddingVertical: 10,
  },
  priceBarLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  priceBarValue: { color: '#F39C12', fontSize: 18, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: '#1A0F0A', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#8B6F5E', marginBottom: 16 },
  optionCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 2, borderColor: '#E8D5C4',
  },
  optionCardSelected: { borderColor: '#C0392B', backgroundColor: '#FFF5EC' },
  optionCardDisabled: { opacity: 0.5 },
  optionLeft: { flex: 1 },
  optionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionName: { fontSize: 16, fontWeight: '600', color: '#1A0F0A' },
  optionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionPrice: { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  checkmark: { fontSize: 18, color: '#27AE60' },
  unavailableText: { fontSize: 12, color: '#E74C3C', marginTop: 2 },
  premiumBadge: { backgroundColor: '#F39C12', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  premiumText: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  // ── Share Card ──
  shareCard: {
    marginTop: 24,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E8D5C4',
    shadowColor: '#6B3A2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shareCardTitle: {
    fontSize: 18, fontWeight: '800', color: '#1A0F0A', marginBottom: 4, textAlign: 'center',
  },
  shareCardSubtitle: {
    fontSize: 13, color: '#8B6F5E', textAlign: 'center', marginBottom: 16,
  },
  mealSummary: {
    backgroundColor: '#FDF8F3',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  mealSummaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  mealSummaryPriceRow: {
    marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E8D5C4',
  },
  mealSummaryIcon: { fontSize: 18, width: 26 },
  mealSummaryText: { fontSize: 15, fontWeight: '600', color: '#1A0F0A', flex: 1 },
  mealSummaryPrice: { fontSize: 17, fontWeight: '800', color: '#C0392B', flex: 1 },
  shareButtonsRow: {
    flexDirection: 'row', gap: 12,
  },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#C0392B', borderRadius: 14, paddingVertical: 13, gap: 8,
  },
  copyLinkBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 13, gap: 8,
    borderWidth: 2, borderColor: '#C0392B',
  },
  copyLinkBtnSuccess: {
    backgroundColor: '#F0FFF4', borderColor: '#27AE60',
  },
  shareBtnDisabled: { opacity: 0.4 },
  shareBtnIcon: { fontSize: 18 },
  shareBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  copyLinkBtnText: { fontSize: 15, fontWeight: '700', color: '#C0392B' },
  copyLinkBtnTextSuccess: { color: '#27AE60' },
  shareHint: {
    marginTop: 12, fontSize: 12, color: '#8B6F5E', textAlign: 'center', fontStyle: 'italic',
  },

  // ── Bottom Bar ──
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8D5C4',
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
  },
  prevBtn: {
    borderWidth: 2, borderColor: '#C0392B', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 20, alignItems: 'center',
  },
  prevBtnText: { color: '#C0392B', fontSize: 16, fontWeight: '700' },
  nextBtn: {
    flex: 2, backgroundColor: '#C0392B', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: '#E8D5C4' },
  nextBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
