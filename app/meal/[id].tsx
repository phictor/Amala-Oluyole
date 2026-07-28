import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { MEALS } from '@/lib/data/mock-data';
import type { CartItem } from '@/lib/data/types';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useAppStore();
  const meal = MEALS.find(m => m.id === id);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');

  if (!meal) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Meal not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isFavourite = state.favouriteMealIds.includes(meal.id);
  const totalPrice = meal.price * quantity;

  const handleAddToCart = () => {
    const cartItem: CartItem = {
      id: `${meal.id}-${Date.now()}`,
      meal,
      quantity,
      unitPrice: meal.price,
      totalPrice,
      specialInstructions: instructions || undefined,
    };
    dispatch({ type: 'ADD_TO_CART', payload: cartItem });
    Alert.alert('Added to Cart! 🛒', `${meal.name} has been added to your cart.`, [
      { text: 'Continue Shopping', style: 'cancel' },
      { text: 'View Cart', onPress: () => router.push('/(tabs)/cart' as never) },
    ]);
  };

  const LABEL_CONFIG: Record<string, { text: string; bg: string }> = {
    popular: { text: 'Popular', bg: '#C0392B' },
    new: { text: 'New', bg: '#27AE60' },
    chefs_choice: { text: "Chef's Choice", bg: '#F39C12' },
    best_seller: { text: 'Best Seller', bg: '#6B3A2A' },
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: meal.imageUrl }} style={styles.heroImage} />
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favBtn}
            onPress={() => dispatch({ type: 'TOGGLE_FAVOURITE', payload: meal.id })}
          >
            <Text style={styles.favIcon}>{isFavourite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Labels */}
          {meal.labels && meal.labels.length > 0 && (
            <View style={styles.labelsRow}>
              {meal.labels.map(label => (
                <View key={label} style={[styles.label, { backgroundColor: LABEL_CONFIG[label]?.bg || '#C0392B' }]}>
                  <Text style={styles.labelText}>{LABEL_CONFIG[label]?.text || label}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.mealName}>{meal.name}</Text>

          {/* Rating & Time */}
          <View style={styles.metaRow}>
            {meal.rating && (
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⭐</Text>
                <Text style={styles.metaText}>{meal.rating.toFixed(1)} ({meal.reviewCount} reviews)</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🕐</Text>
              <Text style={styles.metaText}>{meal.preparationTime} min prep</Text>
            </View>
          </View>

          <Text style={styles.description}>{meal.description}</Text>

          {/* Allergens */}
          {meal.allergens && meal.allergens.length > 0 && (
            <View style={styles.allergenBox}>
              <Text style={styles.allergenTitle}>⚠️ Allergen Information</Text>
              <Text style={styles.allergenText}>{meal.allergens.join(', ')}</Text>
            </View>
          )}

          {/* Availability */}
          <View style={[styles.availabilityBadge, meal.isAvailable ? styles.available : styles.unavailable]}>
            <Text style={styles.availabilityText}>
              {meal.isAvailable ? '✅ Available' : '❌ Currently Unavailable'}
            </Text>
          </View>

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.quantityLabel}>Quantity</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(quantity + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalPrice}>₦{totalPrice.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, !meal.isAvailable && styles.addToCartBtnDisabled]}
          onPress={handleAddToCart}
          disabled={!meal.isAvailable}
        >
          <Text style={styles.addToCartBtnText}>Add to Cart 🛒</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontSize: 18, color: '#1A0F0A', marginBottom: 12 },
  backLink: { color: '#C0392B', fontSize: 16, fontWeight: '600' },
  imageContainer: { position: 'relative' },
  heroImage: { width: '100%', height: 300, backgroundColor: '#F0E4D8' },
  backBtn: {
    position: 'absolute', top: 48, left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  favBtn: {
    position: 'absolute', top: 48, right: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  favIcon: { fontSize: 20 },
  content: { padding: 20 },
  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  label: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  labelText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  mealName: { fontSize: 26, fontWeight: '800', color: '#1A0F0A', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 16 },
  metaText: { fontSize: 14, color: '#8B6F5E' },
  description: { fontSize: 15, color: '#6B3A2A', lineHeight: 24, marginBottom: 16 },
  allergenBox: {
    backgroundColor: '#FFF5EC', borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: '#F39C12', marginBottom: 16,
  },
  allergenTitle: { fontSize: 14, fontWeight: '700', color: '#6B3A2A', marginBottom: 4 },
  allergenText: { fontSize: 13, color: '#8B6F5E' },
  availabilityBadge: { borderRadius: 12, padding: 12, marginBottom: 20, alignItems: 'center' },
  available: { backgroundColor: '#D5F5E3' },
  unavailable: { backgroundColor: '#FDECEA' },
  availabilityText: { fontSize: 14, fontWeight: '700', color: '#1A0F0A' },
  quantitySection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantityLabel: { fontSize: 16, fontWeight: '700', color: '#1A0F0A' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    backgroundColor: '#C0392B', borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  qtyValue: { fontSize: 20, fontWeight: '800', color: '#1A0F0A', minWidth: 32, textAlign: 'center' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8D5C4',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
  },
  totalLabel: { fontSize: 13, color: '#8B6F5E' },
  totalPrice: { fontSize: 22, fontWeight: '800', color: '#C0392B' },
  addToCartBtn: {
    backgroundColor: '#C0392B', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28,
  },
  addToCartBtnDisabled: { backgroundColor: '#E8D5C4' },
  addToCartBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

