import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaystackProvider, usePaystack } from 'react-native-paystack-webview';
import { useCart, useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

// ── Paystack public key — replace with live key before publishing
const PAYSTACK_PUBLIC_KEY = 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

const PAYMENT_METHODS = [
  { id: 'card', label: 'Debit/Credit Card (Paystack)', icon: '💳', requiresPaystack: true },
  { id: 'transfer', label: 'Bank Transfer', icon: '🏦', requiresPaystack: false },
  { id: 'wallet', label: 'Amala Wallet', icon: '👛', requiresPaystack: false },
  { id: 'cash_on_delivery', label: 'Pay on Delivery', icon: '💵', requiresPaystack: false },
  { id: 'loyalty_points', label: 'Redeem Loyalty Points', icon: '⭐', requiresPaystack: false },
];

// ── Inner component that uses the Paystack hook (must be inside PaystackProvider)
function CheckoutInner() {
  const params = useLocalSearchParams<{ orderType?: string }>();
  const orderType = (params.orderType || 'delivery') as 'delivery' | 'pickup';
  const { items, subtotal, deliveryFee, serviceFee, discount, total, dispatch: cartDispatch } = useCart();
  const { state } = useAppStore();
  const { popup } = usePaystack();

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [scheduledTime, setScheduledTime] = useState<'now' | 'later'>('now');
  const [loading, setLoading] = useState(false);

  const grandTotal = orderType === 'pickup' ? total - deliveryFee : total;
  const amountInKobo = Math.round(grandTotal * 100);
  const userEmail = state.user?.email || 'guest@amalaoluyole.com';
  const userName = state.user?.name || 'Guest';

  const placeOrderMutation = trpc.orders.place.useMutation({
    onSuccess: (data: unknown) => {
      const d = data as { id?: number; orderNumber?: string };
      cartDispatch({ type: 'CLEAR_CART' });
      setLoading(false);
      router.replace({ pathname: '/order/[id]' as never, params: { id: String(d?.id ?? 0), isNew: 'true' } });
    },
    onError: (err: { message?: string }) => {
      setLoading(false);
      Alert.alert('Order Failed', err.message || 'Could not place your order. Please try again.');
    },
  });

  const verifyPaymentMutation = trpc.orders.verifyPayment.useMutation({
    onError: (err: { message?: string }) => {
      setLoading(false);
      Alert.alert('Payment Verification Failed', err.message || 'We could not verify your payment. Please contact support with your reference.');
    },
  });

  const generateRef = () => `AO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const buildOrderPayload = (paymentRef?: string) => ({
    branchId: state.selectedBranch ? Number(state.selectedBranch.id) : 1,
    orderType,
    paymentMethod: paymentMethod as 'card' | 'transfer' | 'wallet' | 'cash_on_delivery' | 'loyalty_points',
    paymentReference: paymentRef,
    deliveryAddress: orderType === 'delivery' ? `${address}${landmark ? `, ${landmark}` : ''}` : undefined,
    items: items.map(item => ({
      mealId: item.meal?.id ? Number(item.meal.id) : 1,
      name: item.meal?.name || (item.customMeal ? `${item.customMeal.swallow?.name ?? ''} & ${item.customMeal.soup?.name ?? ''}` : 'Custom Meal'),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      subtotal: item.totalPrice,
      specialInstructions: item.specialInstructions,
    })),
    subtotal,
    deliveryFee: orderType === 'delivery' ? deliveryFee : 0,
    serviceFee,
    discount,
    total: grandTotal,
    scheduledFor: scheduledTime === 'later' ? new Date(Date.now() + 3600_000).toISOString() : undefined,
  });

  const handlePlaceOrder = () => {
    if (orderType === 'delivery' && !address.trim()) {
      Alert.alert('Address Required', 'Please enter your delivery address.');
      return;
    }
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your cart is empty.');
      return;
    }

    const selectedMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod);
    if (selectedMethod?.requiresPaystack) {
      popup.checkout({
        email: userEmail,
        amount: amountInKobo,
        reference: generateRef(),
        metadata: { name: userName, orderType },
        onSuccess: (res) => {
          setLoading(true);
          // Step 1: Place the order (creates DB record in pending state)
          placeOrderMutation.mutate(buildOrderPayload(res.reference), {
            onSuccess: (orderData: unknown) => {
              const order = orderData as { id?: number; orderNumber?: string };
              // Step 2: Verify payment server-side via Paystack API (FR-041)
              verifyPaymentMutation.mutate(
                { orderId: order.id ?? 0, paymentReference: res.reference, expectedAmount: grandTotal },
                {
                  onSuccess: () => {
                    cartDispatch({ type: 'CLEAR_CART' });
                    setLoading(false);
                    router.replace({ pathname: '/order/[id]' as never, params: { id: String(order.id ?? 0), isNew: 'true' } });
                  },
                }
              );
            },
          });
        },
        onCancel: () => {
          Alert.alert('Payment Cancelled', 'Your payment was cancelled. You can try again.');
        },
      });
    } else {
      setLoading(true);
      placeOrderMutation.mutate(buildOrderPayload());
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
  return (
    <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY} currency="NGN">
      <CheckoutInner />
    </PaystackProvider>
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
  paymentLabel: { fontSize: 15, fontWeight: '600', color: '#1A0F0A' },
  paymentSub: { fontSize: 11, color: '#8B6F5E', marginTop: 2 },
  loyaltyPoints: { fontSize: 13, color: '#F39C12', fontWeight: '700' },
  checkmark: { fontSize: 18, color: '#27AE60' },
  paystackBadge: {
    backgroundColor: '#F0FFF4', borderRadius: 10, padding: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  paystackBadgeText: { fontSize: 12, color: '#166534', fontWeight: '600', textAlign: 'center' },
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
  placeOrderBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
