import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { useCart, useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

// ── Paystack public key — replace with live key before publishing
const PAYMENT_METHODS = [
  { id: 'card', label: 'Debit/Credit Card (Paystack)', icon: '💳', requiresPaystack: true },
  { id: 'cash_on_delivery', label: 'Pay on Delivery', icon: '💵', requiresPaystack: false },
];

// ── Inner component that uses the Paystack hook (must be inside PaystackProvider)
function CheckoutInner() {
  const params = useLocalSearchParams<{ orderType?: string }>();
  const orderType = (params.orderType || 'delivery') as 'delivery' | 'pickup';
  const { items, subtotal, deliveryFee, serviceFee, discount, total, promoCode, dispatch: cartDispatch } = useCart();
  const { state } = useAppStore();

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [scheduledTime, setScheduledTime] = useState<'now' | 'later'>('now');
  const [loading, setLoading] = useState(false);

  const grandTotal = orderType === 'pickup' ? total - deliveryFee : total;
  const placeOrderMutation = trpc.orders.place.useMutation();
  const initializePaymentMutation = trpc.orders.initializePayment.useMutation();
  const verifyPaymentMutation = trpc.orders.verifyPayment.useMutation();
  const validateZoneMutation = trpc.orders.validateDeliveryZone.useMutation();

  const buildOrderPayload = (coords?: { latitude: number; longitude: number }) => ({
    branchId: state.selectedBranch ? Number(state.selectedBranch.id) : 1,
    orderType,
    paymentMethod: paymentMethod as 'card' | 'cash_on_delivery',
    promoCode: promoCode || undefined,
    loyaltyPointsUsed: 0,
    deliveryAddress: orderType === 'delivery' ? `${address}${landmark ? `, ${landmark}` : ''}` : undefined,
    deliveryLatitude: coords?.latitude,
    deliveryLongitude: coords?.longitude,
    items: items.map(item => item.customMeal ? ({
      kind: 'custom' as const,
      quantity: item.quantity,
      options: {
        swallowId: item.customMeal.swallow.id,
        soupId: item.customMeal.soup.id,
        proteins: item.customMeal.protein.map(option => ({ id: option.id, quantity: 1 })),
        extras: item.customMeal.extras.map(option => ({ id: option.id, quantity: 1 })),
      },
      specialInstructions: item.specialInstructions ?? item.customMeal.specialInstructions,
    }) : ({ kind: 'meal' as const, mealId: Number(item.meal!.id), quantity: item.quantity, specialInstructions: item.specialInstructions })),
  });

  const handlePlaceOrder = async () => {
    if (orderType === 'delivery' && !address.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    // FR-060: Validate delivery zone if we have GPS coordinates for the branch
    const branchId = state.selectedBranch ? Number(state.selectedBranch.id) : 1;
    setLoading(true);
    try {
      let coords: { latitude: number; longitude: number } | undefined;
      if (orderType === 'delivery') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') throw new Error('Location permission is required to validate delivery eligibility.');
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        const zone = await validateZoneMutation.mutateAsync({ branchId, ...coords });
        if (!zone.withinZone) {
          throw new Error("reason" in zone ? zone.reason : `This location is ${zone.distanceKm} km away and outside the ${zone.radiusKm} km delivery zone.`);
        }
      }
      const order = await placeOrderMutation.mutateAsync(buildOrderPayload(coords));
      if (paymentMethod === 'card') {
        const initialized = await initializePaymentMutation.mutateAsync({ orderId: order.id });
        await WebBrowser.openBrowserAsync(initialized.authorizationUrl);
        await verifyPaymentMutation.mutateAsync({ orderId: order.id, paymentReference: initialized.reference });
      }
      cartDispatch({ type: 'CLEAR_CART' });
      router.replace({ pathname: '/order/[id]' as never, params: { id: String(order.id), isNew: 'true' } });
    } catch (error) {
      Alert.alert('Order Failed', error instanceof Error ? error.message : 'Could not place your order.');
    } finally {
      setLoading(false);
    }
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
        <View style={styles.orderTypeBadge}>
          <Text style={styles.orderTypeBadgeText}>
            {orderType === 'delivery' ? '🛵 Delivery Order' : '🥡 Pickup Order'}
          </Text>
          <Text style={styles.orderTypeBadgeSub}>
            {orderType === 'delivery' ? 'Estimated 30–45 min' : 'Ready in 15–20 min'}
          </Text>
        </View>

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
              placeholderTextColor="#8B88B0"
              value={address}
              onChangeText={setAddress}
              multiline
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Landmark (optional)"
              placeholderTextColor="#8B88B0"
              value={landmark}
              onChangeText={setLandmark}
            />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕐 When do you want it?</Text>
          <View style={styles.scheduleRow}>
            {(['now', 'later'] as const).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.scheduleBtn, scheduledTime === t && styles.scheduleBtnActive]}
                onPress={() => setScheduledTime(t)}
              >
                <Text style={[styles.scheduleBtnText, scheduledTime === t && styles.scheduleBtnTextActive]}>
                  {t === 'now' ? 'Now' : 'Schedule Later'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionSelected]}
              onPress={() => setPaymentMethod(method.id)}
            >
              <Text style={styles.paymentIcon}>{method.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentLabel}>{method.label}</Text>
                {method.requiresPaystack && (
                  <Text style={styles.paymentSub}>Secured by Paystack · Visa, Mastercard, Verve</Text>
                )}
              </View>
              {method.id === 'loyalty' && state.user?.loyaltyAccount && (
                <Text style={styles.loyaltyPoints}>
                  {state.user.loyaltyAccount.points.toLocaleString()} pts
                </Text>
              )}
              {paymentMethod === method.id && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
          {paymentMethod === 'card' && (
            <View style={styles.paystackBadge}>
              <Text style={styles.paystackBadgeText}>🔒 Payments processed securely by Paystack</Text>
            </View>
          )}
        </View>

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
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.placeOrderBtnText}>
              {paymentMethod === 'card'
                ? `Pay ₦${grandTotal.toLocaleString()} with Paystack`
                : `Place Order — ₦${grandTotal.toLocaleString()}`}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Outer wrapper that provides the Paystack context
export default function CheckoutScreen() {
  return <CheckoutInner />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#201060' },
  scrollContent: { paddingHorizontal: 20 },
  orderTypeBadge: {
    backgroundColor: '#1A1640', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  orderTypeBadgeText: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  orderTypeBadgeSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#201060', marginBottom: 12 },
  savedAddresses: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  savedAddr: {
    borderWidth: 1.5, borderColor: '#E8E6F4', borderRadius: 10, padding: 10, minWidth: 120,
  },
  savedAddrSelected: { borderColor: '#D02010', backgroundColor: '#F4F3FB' },
  savedAddrLabel: { fontSize: 12, fontWeight: '700', color: '#1A1640' },
  savedAddrText: { fontSize: 12, color: '#6B6490', marginTop: 2 },
  input: {
    backgroundColor: '#F4F3FB', borderWidth: 1.5, borderColor: '#E8E6F4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#201060',
  },
  scheduleRow: { flexDirection: 'row', gap: 12 },
  scheduleBtn: {
    flex: 1, borderWidth: 2, borderColor: '#E8E6F4', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  scheduleBtnActive: { borderColor: '#D02010', backgroundColor: '#F4F3FB' },
  scheduleBtnText: { fontSize: 15, fontWeight: '600', color: '#6B6490' },
  scheduleBtnTextActive: { color: '#D02010' },
  paymentOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: '#E8E6F4',
  },
  paymentOptionSelected: { borderColor: '#D02010', backgroundColor: '#F4F3FB' },
  paymentIcon: { fontSize: 22 },
  paymentLabel: { fontSize: 15, fontWeight: '600', color: '#201060' },
  paymentSub: { fontSize: 11, color: '#6B6490', marginTop: 2 },
  loyaltyPoints: { fontSize: 13, color: '#F39C12', fontWeight: '700' },
  checkmark: { fontSize: 18, color: '#27AE60' },
  paystackBadge: {
    backgroundColor: '#F0FFF4', borderRadius: 10, padding: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  paystackBadgeText: { fontSize: 12, color: '#166534', fontWeight: '600', textAlign: 'center' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItemName: { flex: 1, fontSize: 14, color: '#6B6490', marginRight: 8 },
  summaryItemPrice: { fontSize: 14, fontWeight: '600', color: '#201060' },
  divider: { height: 1, backgroundColor: '#E8E6F4', marginVertical: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 15, color: '#6B6490' },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#201060' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E8E6F4', paddingTop: 10, marginTop: 4 },
  totalLabel: { fontSize: 18, fontWeight: '800', color: '#201060' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#D02010' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8E6F4',
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
  },
  placeOrderBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  placeOrderBtnLoading: { backgroundColor: '#E8E6F4' },
  placeOrderBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
