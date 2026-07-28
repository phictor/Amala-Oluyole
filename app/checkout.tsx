import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCart, useAppStore } from '@/lib/store/app-store';
import type { Order, Address } from '@/lib/data/types';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Debit/Credit Card', icon: '💳' },
  { id: 'transfer', label: 'Bank Transfer', icon: '🏦' },
  { id: 'wallet', label: 'Amala Wallet', icon: '👛' },
  { id: 'cash', label: 'Pay on Delivery', icon: '💵' },
  { id: 'loyalty', label: 'Redeem Loyalty Points', icon: '⭐' },
];

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ orderType?: string }>();
  const orderType = (params.orderType || 'delivery') as 'delivery' | 'pickup';
  const { items, subtotal, deliveryFee, serviceFee, discount, total, dispatch: cartDispatch } = useCart();
  const { state, dispatch } = useAppStore();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [scheduledTime, setScheduledTime] = useState<'now' | 'later'>('now');
  const [loading, setLoading] = useState(false);

  const grandTotal = orderType === 'pickup' ? total - deliveryFee : total;

  const handlePlaceOrder = () => {
    if (orderType === 'delivery' && !address.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const orderId = `ORD-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        id: orderId,
        orderNumber: orderId,
        status: 'payment_confirmed',
        items: items,
        subtotal,
        deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
        serviceFee,
        discount,
        tax: 0,
        total: grandTotal,
        orderType,
        paymentMethod: paymentMethod as import('@/lib/data/types').PaymentMethod,
        paymentStatus: paymentMethod === 'cash' ? 'pending' : 'paid',
        deliveryAddress: orderType === 'delivery' ? { street: address, landmark } as Address : undefined,
        branchId: state.selectedBranch?.id || '',
        branchName: state.selectedBranch?.name || '',
        estimatedTime: orderType === 'delivery' ? 45 : 20,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      cartDispatch({ type: 'CLEAR_CART' });
      setLoading(false);
      router.replace({ pathname: '/order/[id]' as never, params: { id: orderId, isNew: 'true' } });
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Order Type Badge */}
        <View style={styles.orderTypeBadge}>
          <Text style={styles.orderTypeBadgeText}>
            {orderType === 'delivery' ? '🛵 Delivery Order' : '🥡 Pickup Order'}
          </Text>
          <Text style={styles.orderTypeBadgeSub}>
            {orderType === 'delivery' ? 'Estimated 30–45 min' : 'Ready in 15–20 min'}
          </Text>
        </View>

        {/* Delivery Address */}
        {orderType === 'delivery' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
            {state.user?.addresses && state.user.addresses.length > 0 && (
              <View style={styles.savedAddresses}>
                {state.user.addresses.map(addr => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[styles.savedAddr, address === addr.street && styles.savedAddrSelected]}
                    onPress={() => setAddress(addr.street)}
                  >
                    <Text style={styles.savedAddrLabel}>{addr.label}</Text>
                    <Text style={styles.savedAddrText}>{addr.street}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Enter delivery address"
              placeholderTextColor="#A08070"
              value={address}
              onChangeText={setAddress}
              multiline
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Landmark (optional)"
              placeholderTextColor="#A08070"
              value={landmark}
              onChangeText={setLandmark}
            />
          </View>
        )}

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 When do you want it?</Text>
          <View style={styles.scheduleRow}>
            <TouchableOpacity
              style={[styles.scheduleBtn, scheduledTime === 'now' && styles.scheduleBtnActive]}
              onPress={() => setScheduledTime('now')}
            >
              <Text style={[styles.scheduleBtnText, scheduledTime === 'now' && styles.scheduleBtnTextActive]}>
                Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scheduleBtn, scheduledTime === 'later' && styles.scheduleBtnActive]}
              onPress={() => setScheduledTime('later')}
            >
              <Text style={[styles.scheduleBtnText, scheduledTime === 'later' && styles.scheduleBtnTextActive]}>
                Schedule Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Text style={styles.paymentIcon}>{method.icon}</Text>
              <Text style={styles.paymentLabel}>{method.label}</Text>
              {method.id === 'loyalty' && state.user?.loyaltyAccount && (
                <Text style={styles.loyaltyPoints}>
                  {state.user.loyaltyAccount.points.toLocaleString()} pts
                </Text>
              )}
              {paymentMethod === method.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Order Summary</Text>
          {items.map(item => (
            <View key={item.id} style={styles.summaryItem}>
              <Text style={styles.summaryItemName} numberOfLines={1}>
                {item.quantity}× {item.meal?.name || 'Custom Meal'}
              </Text>
              <Text style={styles.summaryItemPrice}>₦{item.totalPrice.toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.divider} />
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
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>₦{serviceFee.toLocaleString()}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#27AE60' }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: '#27AE60' }]}>−₦{discount.toLocaleString()}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₦{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.placeOrderBtn, loading && styles.placeOrderBtnLoading]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          <Text style={styles.placeOrderBtnText}>
            {loading ? 'Placing Order...' : `Place Order — ₦${grandTotal.toLocaleString()}`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#C0392B', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A0F0A' },
  scrollContent: { paddingHorizontal: 20 },
  orderTypeBadge: {
    backgroundColor: '#6B3A2A', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  orderTypeBadgeText: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  orderTypeBadgeSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A0F0A', marginBottom: 12 },
  savedAddresses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  savedAddr: {
    borderWidth: 1.5, borderColor: '#E8D5C4', borderRadius: 10, padding: 10, minWidth: 120,
  },
  savedAddrSelected: { borderColor: '#C0392B', backgroundColor: '#FFF5EC' },
  savedAddrLabel: { fontSize: 12, fontWeight: '700', color: '#6B3A2A' },
  savedAddrText: { fontSize: 12, color: '#8B6F5E', marginTop: 2 },
  input: {
    backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1A0F0A',
  },
  scheduleRow: { flexDirection: 'row', gap: 12 },
  scheduleBtn: {
    flex: 1, borderWidth: 2, borderColor: '#E8D5C4', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  scheduleBtnActive: { borderColor: '#C0392B', backgroundColor: '#FFF5EC' },
  scheduleBtnText: { fontSize: 15, fontWeight: '600', color: '#8B6F5E' },
  scheduleBtnTextActive: { color: '#C0392B' },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#E8D5C4',
  },
  paymentOptionSelected: { borderColor: '#C0392B', backgroundColor: '#FFF5EC' },
  paymentIcon: { fontSize: 22 },
  paymentLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1A0F0A' },
  loyaltyPoints: { fontSize: 13, color: '#F39C12', fontWeight: '700' },
  checkmark: { fontSize: 18, color: '#27AE60' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItemName: { flex: 1, fontSize: 14, color: '#8B6F5E', marginRight: 8 },
  summaryItemPrice: { fontSize: 14, fontWeight: '600', color: '#1A0F0A' },
  divider: { height: 1, backgroundColor: '#E8D5C4', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 15, color: '#8B6F5E' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#1A0F0A' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E8D5C4', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: '800', color: '#1A0F0A' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#C0392B' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8D5C4',
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
  },
  placeOrderBtn: {
    backgroundColor: '#C0392B', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  placeOrderBtnLoading: { backgroundColor: '#E8D5C4' },
  placeOrderBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
