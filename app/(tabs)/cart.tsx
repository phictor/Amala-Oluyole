import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCart, useAppStore } from '@/lib/store/app-store';
import type { CartItem } from '@/lib/data/types';

const PROMO_CODES: Record<string, number> = {
  WELCOME20: 0.20,
  FAMILY24: 1500,
};

function CartItemRow({ item, onRemove, onUpdateQty }: {
  item: CartItem;
  onRemove: () => void;
  onUpdateQty: (qty: number) => void;
}) {
  const name = item.meal?.name || (item.customMeal
    ? `${item.customMeal.swallow.name} & ${item.customMeal.soup.name}`
    : 'Custom Meal');
  const desc = item.customMeal
    ? `Proteins: ${item.customMeal.protein.map(p => p.name).join(', ')}`
    : item.meal?.description?.slice(0, 60) + '...';

  return (
    <View style={styles.cartItem}>
      <View style={styles.cartItemEmoji}>
        <Text style={styles.cartItemEmojiText}>{item.meal ? '🍽️' : '🍲'}</Text>
      </View>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{name}</Text>
        <Text style={styles.cartItemDesc} numberOfLines={2}>{desc}</Text>
        <Text style={styles.cartItemPrice}>₦{item.unitPrice.toLocaleString()}</Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQty(item.quantity - 1)}>
          <Text style={styles.qtyBtnText}>{item.quantity === 1 ? '🗑️' : '−'}</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => onUpdateQty(item.quantity + 1)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const { items, itemCount, subtotal, deliveryFee, serviceFee, discount, total, promoCode, dispatch } = useCart();
  const { state } = useAppStore();
  const [promoInput, setPromoInput] = useState(promoCode);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    const val = PROMO_CODES[code];
    if (!val) {
      Alert.alert('Invalid Code', 'This promo code is not valid or has expired.');
      return;
    }
    const discountAmount = val < 1 ? Math.round(subtotal * val) : val;
    dispatch({ type: 'SET_PROMO', payload: { code, discount: discountAmount } });
    Alert.alert('Promo Applied! 🎉', `You saved ₦${discountAmount.toLocaleString()}!`);
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
        <Text style={styles.emptyTitle}>Your cart is empty</Text>
        <Text style={styles.emptySubtitle}>Add some delicious meals to get started!</Text>
        <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/menu' as never)}>
          <Text style={styles.browseBtnText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        <TouchableOpacity onPress={() => Alert.alert('Clear Cart', 'Remove all items?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear', style: 'destructive', onPress: () => dispatch({ type: 'CLEAR_CART' }) },
        ])}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onRemove={() => dispatch({ type: 'REMOVE_FROM_CART', payload: item.id })}
            onUpdateQty={(qty) => {
              if (qty <= 0) dispatch({ type: 'REMOVE_FROM_CART', payload: item.id });
              else dispatch({ type: 'UPDATE_CART_QUANTITY', payload: { id: item.id, quantity: qty } });
            }}
          />
        )}
        ListFooterComponent={
          <View>
            {/* Order Type */}
            <View style={styles.orderTypeSection}>
              <Text style={styles.sectionLabel}>Order Type</Text>
              <View style={styles.orderTypeRow}>
                <TouchableOpacity
                  style={[styles.orderTypeBtn, orderType === 'delivery' && styles.orderTypeBtnActive]}
                  onPress={() => setOrderType('delivery')}
                >
                  <Text style={[styles.orderTypeBtnText, orderType === 'delivery' && styles.orderTypeBtnTextActive]}>
                    🛵 Delivery
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.orderTypeBtn, orderType === 'pickup' && styles.orderTypeBtnActive]}
                  onPress={() => setOrderType('pickup')}
                >
                  <Text style={[styles.orderTypeBtnText, orderType === 'pickup' && styles.orderTypeBtnTextActive]}>
                    🥡 Pickup
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Promo Code */}
            <View style={styles.promoSection}>
              <Text style={styles.sectionLabel}>Promo Code</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter promo code"
                  placeholderTextColor="#A08070"
                  value={promoInput}
                  onChangeText={setPromoInput}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.promoApplyBtn} onPress={applyPromo}>
                  <Text style={styles.promoApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>₦{subtotal.toLocaleString()}</Text>
              </View>
              {orderType === 'delivery' && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={styles.summaryValue}>₦{deliveryFee.toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Fee (5%)</Text>
                <Text style={styles.summaryValue}>₦{serviceFee.toLocaleString()}</Text>
              </View>
              {discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#27AE60' }]}>Discount ({promoCode})</Text>
                  <Text style={[styles.summaryValue, { color: '#27AE60' }]}>−₦{discount.toLocaleString()}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total</Text>
                <Text style={styles.summaryTotalValue}>
                  ₦{(orderType === 'pickup' ? total - deliveryFee : total).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={{ height: 100 }} />
          </View>
        }
      />

      {/* Checkout Button */}
      <View style={styles.checkoutBar}>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push({ pathname: '/checkout' as never, params: { orderType } })}
        >
          <LinearGradient colors={['#C0392B', '#8B1A10']} style={styles.checkoutBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
            <Text style={styles.checkoutBtnAmount}>₦{(orderType === 'pickup' ? total - deliveryFee : total).toLocaleString()}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  emptyContainer: { flex: 1, backgroundColor: '#FDF8F3', alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIconCircle: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#FFF5EC', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: '#1A0F0A', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#8B6F5E', textAlign: 'center', marginBottom: 32 },
  browseBtn: { borderRadius: 16, overflow: 'hidden', width: '100%' },
  browseBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  browseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#1A0F0A' },
  clearText: { color: '#E74C3C', fontSize: 15, fontWeight: '600' },
  list: { paddingHorizontal: 20 },
  cartItem: {
    flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 14, padding: 12,
    marginBottom: 10, alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cartItemEmoji: {
    width: 56, height: 56, borderRadius: 12, backgroundColor: '#FFF5EC',
    alignItems: 'center', justifyContent: 'center',
  },
  cartItemEmojiText: { fontSize: 28 },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 15, fontWeight: '700', color: '#1A0F0A', marginBottom: 2 },
  cartItemDesc: { fontSize: 12, color: '#8B6F5E', marginBottom: 4 },
  cartItemPrice: { fontSize: 15, fontWeight: '800', color: '#C0392B' },
  cartItemActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    backgroundColor: '#FFF5EC', borderRadius: 8, width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8D5C4',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#C0392B' },
  qtyText: { fontSize: 16, fontWeight: '700', color: '#1A0F0A', minWidth: 20, textAlign: 'center' },
  orderTypeSection: { marginTop: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 16, fontWeight: '700', color: '#1A0F0A', marginBottom: 10 },
  orderTypeRow: { flexDirection: 'row', gap: 12 },
  orderTypeBtn: {
    flex: 1, borderWidth: 2, borderColor: '#E8D5C4', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  orderTypeBtnActive: { borderColor: '#C0392B', backgroundColor: '#FFF5EC' },
  orderTypeBtnText: { fontSize: 15, fontWeight: '600', color: '#8B6F5E' },
  orderTypeBtnTextActive: { color: '#C0392B' },
  promoSection: { marginBottom: 16 },
  promoRow: { flexDirection: 'row', gap: 10 },
  promoInput: {
    flex: 1, backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A0F0A',
  },
  promoApplyBtn: {
    backgroundColor: '#C0392B', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center',
  },
  promoApplyText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  summary: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#E8D5C4',
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: '#1A0F0A', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 15, color: '#8B6F5E' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#1A0F0A' },
  summaryTotal: { borderTopWidth: 1, borderTopColor: '#E8D5C4', paddingTop: 12, marginTop: 4 },
  summaryTotalLabel: { fontSize: 18, fontWeight: '800', color: '#1A0F0A' },
  summaryTotalValue: { fontSize: 20, fontWeight: '800', color: '#C0392B' },
  checkoutBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8D5C4',
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
  },
  checkoutBtn: { borderRadius: 16, overflow: 'hidden' },
  checkoutBtnGrad: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 18,
  },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  checkoutBtnAmount: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});

