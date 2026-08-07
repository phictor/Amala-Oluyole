import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number or email.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.emoji}>🔐</Text>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your phone number or email and we’ll send you a reset code.
      </Text>

      {sent ? (
        <View style={styles.successBox}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Code Sent!</Text>
          <Text style={styles.successText}>Check your phone or email for the reset code.</Text>
          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.replace('/auth/login')}>
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.label}>Phone Number or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 08012345678"
            placeholderTextColor="#8B88B0"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.btnDisabled]}
            onPress={handleSend} disabled={loading}
          >
            <Text style={styles.sendBtnText}>{loading ? 'Sending...' : 'Send Reset Code'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  backBtn: { paddingTop: 56, paddingBottom: 8 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600' },
  emoji: { fontSize: 56, marginTop: 24, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#201060', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B6490', lineHeight: 22, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#201060', marginBottom: 8 },
  input: {
    backgroundColor: '#F4F3FB', borderWidth: 1.5, borderColor: '#E8E6F4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#201060', marginBottom: 24,
  },
  sendBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  sendBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  successBox: { alignItems: 'center', paddingTop: 40 },
  successEmoji: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#27AE60', marginBottom: 8 },
  successText: { fontSize: 15, color: '#6B6490', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  backToLoginBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 40, alignItems: 'center',
  },
  backToLoginText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

