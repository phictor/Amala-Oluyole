import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '@/lib/store/app-store';
import { BRANCHES } from '@/lib/data/mock-data';

const SEATING = [
  { id: 'indoor', label: 'Indoor', icon: '🏠' },
  { id: 'outdoor', label: 'Outdoor', icon: '🌳' },
  { id: 'private', label: 'Private Room', icon: '🔒' },
];

const TIME_SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

export default function ReservationScreen() {
  const { state } = useAppStore();
  const [branchId, setBranchId] = useState(state.selectedBranch?.id || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [seating, setSeating] = useState('indoor');
  const [requests, setRequests] = useState('');
  const [name, setName] = useState(state.user?.name || '');
  const [phone, setPhone] = useState(state.user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!branchId || !date || !time || !name || !phone) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const code = `RES-${Date.now().toString().slice(-6)}`;
      Alert.alert(
        '🍽️ Reservation Confirmed!',
        `Your reservation has been confirmed.\n\nConfirmation Code: ${code}\n\nWe look forward to seeing you!`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    }, 1200);
  };

  const dineInBranches = BRANCHES.filter(b => b.supportsDineIn);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Make a Reservation</Text>
        <Text style={styles.subtitle}>Book a table at your preferred branch</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Branch */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Branch *</Text>
          {dineInBranches.map(branch => (
            <TouchableOpacity
              key={branch.id}
              style={[styles.optionBtn, branchId === branch.id && styles.optionBtnActive]}
              onPress={() => setBranchId(branch.id)}
            >
              <Text style={[styles.optionBtnText, branchId === branch.id && styles.optionBtnTextActive]}>
                {branch.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date * (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2026-08-15"
            placeholderTextColor="#A08070"
            value={date}
            onChangeText={setDate}
          />
        </View>

        {/* Time */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Time *</Text>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map(slot => (
              <TouchableOpacity
                key={slot}
                style={[styles.timeSlot, time === slot && styles.timeSlotActive]}
                onPress={() => setTime(slot)}
              >
                <Text style={[styles.timeSlotText, time === slot && styles.timeSlotTextActive]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Guests */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Number of Guests *</Text>
          <View style={styles.guestsRow}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setGuests(String(Math.max(1, parseInt(guests) - 1)))}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.guestsValue}>{guests}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => setGuests(String(Math.min(20, parseInt(guests) + 1)))}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Seating */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Seating Preference</Text>
          <View style={styles.seatingRow}>
            {SEATING.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.seatingBtn, seating === s.id && styles.seatingBtnActive]}
                onPress={() => setSeating(s.id)}
              >
                <Text style={styles.seatingIcon}>{s.icon}</Text>
                <Text style={[styles.seatingLabel, seating === s.id && styles.seatingLabelActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Your Name *</Text>
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#A08070" value={name} onChangeText={setName} />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Phone Number *</Text>
          <TextInput style={styles.input} placeholder="08XXXXXXXXX" placeholderTextColor="#A08070" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Special Requests</Text>
          <TextInput style={[styles.input, styles.textarea]} placeholder="Any dietary requirements, occasion, etc." placeholderTextColor="#A08070" value={requests} onChangeText={setRequests} multiline numberOfLines={3} />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnLoading]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Booking...' : 'Confirm Reservation'}</Text>
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
  optionBtn: {
    borderWidth: 1.5, borderColor: '#E8D5C4', borderRadius: 10, paddingVertical: 10,
    paddingHorizontal: 14, marginBottom: 8,
  },
  optionBtnActive: { borderColor: '#C0392B', backgroundColor: '#FFF5EC' },
  optionBtnText: { fontSize: 15, color: '#8B6F5E', fontWeight: '600' },
  optionBtnTextActive: { color: '#C0392B' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeSlot: {
    borderWidth: 1.5, borderColor: '#E8D5C4', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#FFF5EC',
  },
  timeSlotActive: { backgroundColor: '#C0392B', borderColor: '#C0392B' },
  timeSlotText: { fontSize: 14, fontWeight: '600', color: '#8B6F5E' },
  timeSlotTextActive: { color: '#FFF' },
  guestsRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  qtyBtn: {
    backgroundColor: '#C0392B', borderRadius: 20, width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  guestsValue: { fontSize: 24, fontWeight: '800', color: '#1A0F0A', minWidth: 40, textAlign: 'center' },
  seatingRow: { flexDirection: 'row', gap: 10 },
  seatingBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#E8D5C4', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', gap: 4,
  },
  seatingBtnActive: { borderColor: '#C0392B', backgroundColor: '#FFF5EC' },
  seatingIcon: { fontSize: 24 },
  seatingLabel: { fontSize: 12, fontWeight: '600', color: '#8B6F5E' },
  seatingLabelActive: { color: '#C0392B' },
  submitBtn: {
    backgroundColor: '#C0392B', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  submitBtnLoading: { backgroundColor: '#E8D5C4' },
  submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});

