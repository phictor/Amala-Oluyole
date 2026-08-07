import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/lib/store/app-store';
import type { User } from '@/lib/data/types';

export default function OTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { dispatch } = useAppStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length < 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const user: User = {
        id: 'u1',
        name: 'New User',
        phone: phone || '',
        addresses: [],
        loyaltyAccount: {
          points: 100,
          tier: 'bronze',
          pointsToNextTier: 900,
          totalEarned: 100,
          totalRedeemed: 0,
          history: [],
        },
        isGuest: false,
      };
      dispatch({ type: 'SET_USER', payload: user });
      setLoading(false);
      router.replace('/branch-select' as never);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verify Your Number</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.phone}>{phone}</Text>
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { inputs.current[i] = ref; }}
            style={[styles.otpInput, digit && styles.otpInputFilled]}
            value={digit}
            onChangeText={(t) => handleChange(t.slice(-1), i)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.verifyBtn, loading && styles.btnDisabled]}
        onPress={handleVerify} disabled={loading}
      >
        <Text style={styles.verifyBtnText}>{loading ? 'Verifying...' : 'Verify'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resendBtn}>
        <Text style={styles.resendText}>Didn’t receive the code? <Text style={styles.resendLink}>Resend</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  backBtn: { paddingTop: 56, paddingBottom: 8 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: '#201060', marginTop: 24, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B6490', lineHeight: 22, marginBottom: 40 },
  phone: { color: '#D02010', fontWeight: '700' },
  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 40 },
  otpInput: {
    flex: 1, height: 56, borderWidth: 2, borderColor: '#E8E6F4',
    borderRadius: 12, fontSize: 24, fontWeight: '700', color: '#201060',
    backgroundColor: '#F4F3FB', textAlign: 'center',
  },
  otpInputFilled: { borderColor: '#D02010', backgroundColor: '#F4F3FB' },
  verifyBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  verifyBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  resendBtn: { alignItems: 'center', marginTop: 24 },
  resendText: { color: '#6B6490', fontSize: 15 },
  resendLink: { color: '#D02010', fontWeight: '700' },
});
