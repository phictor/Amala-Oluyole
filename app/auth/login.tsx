import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store/app-store';
import type { User } from '@/lib/data/types';
import { Image as ExpoImage } from 'expo-image';

const LOGO_CHEF = require('@/assets/images/logo-chef.png');

export default function LoginScreen() {
  const { dispatch } = useAppStore();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter your phone number and password.');
      return;
    }
    setLoading(true);
    // Simulate login
    setTimeout(() => {
      const user: User = {
        id: 'u1',
        name: 'Adebayo Oladele',
        phone: phone,
        email: 'adebayo@example.com',
        addresses: [],
        loyaltyAccount: {
          points: 1250,
          tier: 'silver',
          pointsToNextTier: 750,
          totalEarned: 3500,
          totalRedeemed: 2250,
          history: [],
        },
        isGuest: false,
      };
      dispatch({ type: 'SET_USER', payload: user });
      setLoading(false);
      router.replace('/branch-select' as never);
    }, 1000);
  };

  const handleGuestAccess = () => {
    dispatch({ type: 'SET_GUEST', payload: true });
    router.replace('/branch-select' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <ExpoImage source={LOGO_CHEF} style={styles.logoImg} contentFit="contain" />
          <Text style={styles.brand}>Àmàlà Olúyòlé</Text>
          <Text style={styles.tagline}>Welcome back! Sign in to continue.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Phone Number or Email</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 08012345678"
            placeholderTextColor="#8B88B0"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Enter your password"
              placeholderTextColor="#8B88B0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/auth/forgot-password' as never)}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.guestBtn} onPress={handleGuestAccess}>
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={styles.footerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', paddingTop: 64, paddingBottom: 40 },
  logo: { fontSize: 64, marginBottom: 12 },
  logoImg: { width: 110, height: 110, marginBottom: 12 },
  brand: { fontSize: 28, fontWeight: '800', color: '#201060', marginBottom: 8 },
  tagline: { fontSize: 15, color: '#6B6490', textAlign: 'center' },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#201060', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F4F3FB', borderWidth: 1.5, borderColor: '#E8E6F4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#201060', marginBottom: 4,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 14, backgroundColor: '#F4F3FB', borderWidth: 1.5, borderColor: '#E8E6F4', borderRadius: 12 },
  eyeIcon: { fontSize: 18 },
  forgotText: { color: '#D02010', fontSize: 14, fontWeight: '600', textAlign: 'right', marginTop: 4, marginBottom: 20 },
  loginBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E8E6F4' },
  dividerText: { color: '#6B6490', fontSize: 14 },
  guestBtn: {
    borderWidth: 2, borderColor: '#D02010', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  guestBtnText: { color: '#D02010', fontSize: 16, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 32 },
  footerText: { color: '#6B6490', fontSize: 15 },
  footerLink: { color: '#D02010', fontSize: 15, fontWeight: '700' },
});
