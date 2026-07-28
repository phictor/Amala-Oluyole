import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';

const EVENT_TYPES = ['Wedding', 'Birthday Party', 'Corporate Event', 'Naming Ceremony', 'Anniversary', 'Conference', 'Other'];
const BUDGET_RANGES = ['Under ₦100,000', '₦100,000 – ₦500,000', '₦500,000 – ₦1,000,000', 'Above ₦1,000,000'];

export default function CateringScreen() {
  const { state } = useAppStore();
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

  const handleSubmit = () => {
    if (!eventType || !eventDate || !venue || !contactName || !contactPhone) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        '🎪 Request Submitted!',
        'Your catering request has been submitted. Our team will contact you within 24 hours with a quote.',
        [{ text: 'Done', onPress: () => router.back() }]
      );
    }, 1200);
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
          <TextInput style={styles.input} placeholder="e.g. 2026-09-20" placeholderTextColor="#A08070" value={eventDate} onChangeText={setEventDate} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Event Time</Text>
          <TextInput style={styles.input} placeholder="e.g. 14:00" placeholderTextColor="#A08070" value={eventTime} onChangeText={setEventTime} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Venue / Location *</Text>
          <TextInput style={styles.input} placeholder="Full address of event venue" placeholderTextColor="#A08070" value={venue} onChangeText={setVenue} multiline />
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
          <TextInput style={[styles.input, styles.textarea]} placeholder="e.g. Amala & Ewedu, Jollof Rice, Pepper Soup..." placeholderTextColor="#A08070" value={preferredMeals} onChangeText={setPreferredMeals} multiline numberOfLines={3} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Service Requirements</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="e.g. Serving staff, equipment, setup..." placeholderTextColor="#A08070" value={serviceReqs} onChangeText={setServiceReqs} multiline numberOfLines={3} />
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
          <TextInput style={styles.input} placeholder="Your full name" placeholderTextColor="#A08070" value={contactName} onChangeText={setContactName} />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Contact Phone *</Text>
          <TextInput style={styles.input} placeholder="08XXXXXXXXX" placeholderTextColor="#A08070" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Additional Information</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="Any other details..." placeholderTextColor="#A08070" value={additionalInfo} onChangeText={setAdditionalInfo} multiline numberOfLines={3} />
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
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  header: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  backText: { color: '#C0392B', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#1A0F0A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8B6F5E' },
  scrollContent: { paddingHorizontal: 20 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 15, fontWeight: '700', color: '#1A0F0A', marginBottom: 8 },
  input: {
    backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1A0F0A',
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5, borderColor: '#E8D5C4', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#FFF5EC',
  },
  chipActive: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#8B6F5E' },
  chipTextActive: { color: '#FFF' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    backgroundColor: '#C0392B', borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  guestsValue: { fontSize: 24, fontWeight: '800', color: '#1A0F0A', minWidth: 60, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#C0392B', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnLoading: { backgroundColor: '#E8D5C4' },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});

