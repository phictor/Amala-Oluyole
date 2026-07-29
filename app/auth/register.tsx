import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { startOAuthLogin } from '@/constants/oauth';

const LOGO_CHEF = require('@/assets/images/logo-chef.png');

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    try {
      setLoading(true);
      await startOAuthLogin();
    } catch {
      Alert.alert('Error', 'Could not open the sign-up page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        <ExpoImage source={LOGO_CHEF} style={styles.logo} contentFit="contain" />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Join Àmàlà Olúyòlé and enjoy exclusive rewards, faster checkout, and order tracking.
        </Text>
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Continue to Sign Up</Text>}
        </TouchableOpacity>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login' as never)}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  backBtn: { paddingTop: 56, paddingBottom: 8 },
  backText: { color: '#D02010', fontSize: 16, fontWeight: '600' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  logo: { width: 100, height: 100, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#201060' },
  subtitle: { fontSize: 15, color: '#6B6490', textAlign: 'center', lineHeight: 22 },
  btn: { backgroundColor: '#D02010', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', width: '100%' },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
  footer: { flexDirection: 'row', marginTop: 8 },
  footerText: { color: '#6B6490', fontSize: 15 },
  footerLink: { color: '#D02010', fontSize: 15, fontWeight: '700' },
});
