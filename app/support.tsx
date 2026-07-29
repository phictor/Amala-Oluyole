import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

const ISSUE_TYPES = [
  { id: 'wrong_order', label: 'Wrong Order Received', icon: '❌' },
  { id: 'missing_item', label: 'Missing Item', icon: '🔍' },
  { id: 'quality', label: 'Food Quality Issue', icon: '🍽️' },
  { id: 'delivery', label: 'Delivery Problem', icon: '🛵' },
  { id: 'payment', label: 'Payment Issue', icon: '💳' },
  { id: 'app', label: 'App Technical Issue', icon: '📱' },
  { id: 'other', label: 'Other', icon: '💬' },
];

const FAQS = [
  { q: 'How do I track my order?', a: 'Go to "My Orders" in the app and tap on your active order to see real-time tracking.' },
  { q: 'Can I cancel my order?', a: 'Orders can be cancelled within 5 minutes of placement. After that, please contact support.' },
  { q: 'How do loyalty points work?', a: 'You earn 10 points for every ₦100 spent. Points can be redeemed at checkout.' },
  { q: 'What payment methods are accepted?', a: 'We accept debit/credit cards, bank transfer, Amala Wallet, and cash on delivery.' },
  { q: 'How long does delivery take?', a: 'Delivery typically takes 30–45 minutes depending on your location and branch.' },
];

export default function SupportScreen() {
  const { state } = useAppStore();
  const createTicket = trpc.support.create.useMutation();
  const [issueType, setIssueType] = useState('');
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'ticket' | 'faq'>('ticket');

  const handleSubmit = async () => {
    if (!issueType || !message.trim()) {
      Alert.alert('Missing Information', 'Please select an issue type and describe your problem.');
      return;
    }
    if (!state.isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to submit a support ticket.', [
        { text: 'Sign In', onPress: () => router.push('/auth/login' as never) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setLoading(true);
    const categoryMap: Record<string, 'order_issue' | 'payment' | 'delivery' | 'food_quality' | 'app_bug' | 'general'> = {
      wrong_order: 'order_issue', missing_item: 'order_issue',
      quality: 'food_quality', delivery: 'delivery',
      payment: 'payment', app: 'app_bug', other: 'general',
    };
    try {
      await createTicket.mutateAsync({
        orderId: orderId ? parseInt(orderId, 10) : undefined,
        category: categoryMap[issueType] ?? 'general',
        subject: ISSUE_TYPES.find(t => t.id === issueType)?.label ?? 'Support Request',
        message: message.trim(),
      });
      Alert.alert(
        '✅ Ticket Submitted',
        'Your support request has been submitted. We will respond within 2 hours.',
        [{ text: 'OK', onPress: () => { setIssueType(''); setMessage(''); setOrderId(''); } }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit ticket. Please try again.');
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
        <Text style={styles.title}>Help & Support</Text>
      </View>

      {/* Quick Contact */}
      <View style={styles.quickContact}>
        <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('tel:+2348000000000')}>
          <Text style={styles.contactIcon}>📞</Text>
          <Text style={styles.contactLabel}>Call Us</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('https://wa.me/2348000000000')}>
          <Text style={styles.contactIcon}>💬</Text>
          <Text style={styles.contactLabel}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL('mailto:support@amalaoluyole.com')}>
          <Text style={styles.contactIcon}>📧</Text>
          <Text style={styles.contactLabel}>Email</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'ticket' && styles.tabBtnActive]} onPress={() => setTab('ticket')}>
          <Text style={[styles.tabBtnText, tab === 'ticket' && styles.tabBtnTextActive]}>Submit Ticket</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'faq' && styles.tabBtnActive]} onPress={() => setTab('faq')}>
          <Text style={[styles.tabBtnText, tab === 'faq' && styles.tabBtnTextActive]}>FAQs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'ticket' ? (
          <View>
            <Text style={styles.sectionTitle}>What's the issue?</Text>
            <View style={styles.issueGrid}>
              {ISSUE_TYPES.map(issue => (
                <TouchableOpacity
                  key={issue.id}
                  style={[styles.issueBtn, issueType === issue.id && styles.issueBtnActive]}
                  onPress={() => setIssueType(issue.id)}
                >
                  <Text style={styles.issueIcon}>{issue.icon}</Text>
                  <Text style={[styles.issueLabel, issueType === issue.id && styles.issueLabelActive]} numberOfLines={2}>
                    {issue.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Related Order ID (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. ORD-123456"
                placeholderTextColor="#8B88B0"
                value={orderId}
                onChangeText={setOrderId}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Describe your issue *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Please describe what happened in detail..."
                placeholderTextColor="#8B88B0"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnLoading]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : 'Submit Support Ticket'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            {FAQS.map((faq, i) => (
              <TouchableOpacity
                key={i}
                style={styles.faqCard}
                onPress={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQ}>{faq.q}</Text>
                  <Text style={styles.faqChevron}>{expandedFaq === i ? '▲' : '▼'}</Text>
                </View>
                {expandedFaq === i && (
                  <Text style={styles.faqA}>{faq.a}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#201060' },
  quickContact: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
  contactBtn: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E6F4', gap: 4,
  },
  contactIcon: { fontSize: 24 },
  contactLabel: { fontSize: 12, fontWeight: '700', color: '#1A1640' },
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 12 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E6F4', backgroundColor: '#F4F3FB',
  },
  tabBtnActive: { backgroundColor: '#D02010', borderColor: '#D02010' },
  tabBtnText: { fontSize: 14, fontWeight: '700', color: '#6B6490' },
  tabBtnTextActive: { color: '#FFF' },
  scrollContent: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#201060', marginBottom: 14 },
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  issueBtn: {
    width: '47%', backgroundColor: '#FFF', borderRadius: 12, padding: 12,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#E8E6F4', gap: 6,
  },
  issueBtnActive: { borderColor: '#D02010', backgroundColor: '#F4F3FB' },
  issueIcon: { fontSize: 28 },
  issueLabel: { fontSize: 12, fontWeight: '600', color: '#6B6490', textAlign: 'center' },
  issueLabelActive: { color: '#D02010' },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: '#201060', marginBottom: 8 },
  input: {
    backgroundColor: '#F4F3FB', borderWidth: 1.5, borderColor: '#E8E6F4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#201060',
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnLoading: { backgroundColor: '#E8E6F4' },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  faqCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8E6F4',
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  faqQ: { flex: 1, fontSize: 15, fontWeight: '700', color: '#201060', marginRight: 8 },
  faqChevron: { fontSize: 12, color: '#D02010' },
  faqA: { fontSize: 14, color: '#6B6490', lineHeight: 22, marginTop: 10 },
});
