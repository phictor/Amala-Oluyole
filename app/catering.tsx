import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { trpc } from '@/lib/trpc';

const EVENT_TYPES = ['Wedding', 'Birthday Party', 'Corporate Event', 'Naming Ceremony', 'Anniversary', 'Conference', 'Other'];
const BUDGET_RANGES = ['Under ₦100,000', '₦100,000 – ₦500,000', '₦500,000 – ₦1,000,000', 'Above ₦1,000,000'];

export default function CateringScreen() {
  const { state } = useAppStore();
  const createCatering = trpc.catering.create.useMutation();
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venue, setVenue] = useState('');
  const [guestCount, setGuestCount] = useState('50');
  const [preferredMeals, setPreferredMeals] = useState('');
  const [serviceReqs, setServiceReqs] = useState('');
  const [budget, setBudget] = useState('');
  const [contactName, setContactName] = useState(state.user?.name || '');
  const [contactPhone, setContactPhone] = useState(state.user?.phone || '');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!eventType || !eventDate || !venue || !contactName || !contactPhone) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    if (!state.isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to submit a catering request.', [
        { text: 'Sign In', onPress: () => router.push('/auth/login' as never) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    setLoading(true);
    const budgetMap: Record<string, number> = {
      'Under ₦100,000': 75000,
      '₦100,000 – ₦500,000': 300000,
      '₦500,000 – ₦1,000,000': 750000,
      'Above ₦1,000,000': 1500000,
    };
    try {
      await createCatering.mutateAsync({
        branchId: 1,
        contactName,
        contactPhone,
        eventType,
        eventDate,
        guestCount: parseInt(guestCount, 10) || 50,
        venue,
        mealPreferences: preferredMeals || undefined,
        budget: budget ? budgetMap[budget] : undefined,
        additionalRequirements: [serviceReqs, additionalInfo].filter(Boolean).join('\n') || undefined,
      });
      Alert.alert(
        '🎪 Request Submitted!',
        'Your catering request has been submitted. Our team will contact you within 24 hours with a quote.',
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit catering request. Please try again.');
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
        <Text style={styles.title}>Catering Request</Text>
        <Text style={styles.subtitle}>Let us cater your special event</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Event Type */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Event Type *</Text>
          <View style={styles.chipGrid}>
            {EVENT_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, eventType === type && styles.chipActive]}
                onPress={() => setEventType(type)}
              >
                <Text style={[styles.chipText, eventType === type && styles.chipTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Event Date * (YYYY-MM-DD)</Text>
          <TextInput style={styles.input} placeholder="e.g. 2026-09-20" placeholderTextColor="#8B88B0" value={eventDate} onChangeText={setEventDate} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Event Time</Text>
          <TextInput style={styles.input} placeholder="e.g. 14:00" placeholderTextColor="#8B88B0" value={eventTime} onChangeText={setEventTime} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Venue / Location *</Text>
          <TextInput style={styles.input} placeholder="Full address of event venue" placeholderTextColor="#8B88B0" value={venue} onChangeText={setVenue} multiline />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Expected Number of Guests</Text>
          <View style={styles.guestsRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setGuestCount(String(Math.max(10, parseInt(guestCount) - 10)))}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.guestsValue}>{guestCount}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setGuestCount(String(parseInt(guestCount) + 10))}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Preferred Meals</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="e.g. Amala & Ewedu, Jollof Rice, Pepper Soup..." placeholderTextColor="#8B88B0" value={preferredMeals} onChangeText={setPreferredMeals} multiline numberOfLines={3} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Service Requirements</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="e.g. Serving staff, equipment, setup..." placeholderTextColor="#8B88B0" value={serviceReqs} onChangeText={setServiceReqs} multiline numberOfLines={3} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Budget Range</Text>
          <View style={styles.chipGrid}>
            {BUDGET_RANGES.map(range => (
              <TouchableOpacity
                key={range}
                style={[styles.chip, budget === range && styles.chipActive]}
                onPress={() => setBudget(range)}
              >
                <Text style={[styles.chipText, budget === range && styles.chipTextActive]}>{range}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Contact Name *</Text>
          <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#8B88B0" value={contactName} onChangeText={setContactName} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Contact Phone *</Text>
          <TextInput style={styles.input} placeholder="08XXXXXXXXX" placeholderTextColor="#8B88B0" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Additional Information</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="Any other details..." placeholderTextColor="#8B88B0" value={additionalInfo} onChangeText={setAdditionalInfo} multiline numberOfLines={3} />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnLoading]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : 'Submit Catering Request'}</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#201060', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B6490' },
  scrollContent: { paddingHorizontal: 20 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: '#201060', marginBottom: 8 },
  input: {
    backgroundColor: '#F4F3FB', borderWidth: 1.5, borderColor: '#E8E6F4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#201060',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5, borderColor: '#E8E6F4', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#F4F3FB',
  },
  chipActive: { backgroundColor: '#D02010', borderColor: '#D02010' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6B6490' },
  chipTextActive: { color: '#FFF' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    backgroundColor: '#D02010', borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  guestsValue: { fontSize: 24, fontWeight: '800', color: '#201060', minWidth: 60, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnLoading: { backgroundColor: '#E8E6F4' },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
