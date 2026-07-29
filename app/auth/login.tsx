import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useAppStore } from '@/lib/store/app-store';
import { startOAuthLogin } from '@/constants/oauth';

const LOGO_CHEF = require('@/assets/images/logo-chef.png');

export default function LoginScreen() {
  const { dispatch } = useAppStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await startOAuthLogin();
      // OAuth flow opens browser; callback handled by app/oauth/callback.tsx
      // On return, the callback sets session token and redirects to /(tabs)
    } catch (err) {
      Alert.alert('Login Error', 'Could not open the login page. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.tagline}>Sign in to order, track deliveries, and earn rewards.</Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.form}>
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In / Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.guestBtn} onPress={handleGuestAccess}>
            <Text style={styles.guestBtnText}>Continue as Guest</Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            By signing in you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', paddingTop: 80, paddingBottom: 48 },
  logoImg: { width: 120, height: 120, marginBottom: 16 },
  brand: { fontSize: 30, fontWeight: '800', color: '#201060', marginBottom: 10 },
  tagline: { fontSize: 15, color: '#6B6490', textAlign: 'center', lineHeight: 22 },
  form: { gap: 4 },
  loginBtn: {
    backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 18,
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
  note: { color: '#9BA1A6', fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
