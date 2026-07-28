import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = () => {
    if (!name || !phone || !password) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: '/auth/otp' as never, params: { phone } });
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join Amala Oluyole and enjoy exclusive rewards.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput style={styles.input} placeholder="e.g. Adebayo Oladele"
            placeholderTextColor="#A08070" value={name} onChangeText={setName} />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput style={styles.input} placeholder="e.g. 08012345678"
            placeholderTextColor="#A08070" value={phone} onChangeText={setPhone}
            keyboardType="phone-pad" />

          <Text style={styles.label}>Email Address (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g. adebayo@email.com"
            placeholderTextColor="#A08070" value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.label}>Password *</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="At least 8 characters"
              placeholderTextColor="#A08070"
              value={password} onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput style={styles.input} placeholder="Repeat your password"
            placeholderTextColor="#A08070" value={confirmPassword}
            onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />

          <Text style={styles.terms}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms & Conditions</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          <TouchableOpacity
            style={[styles.registerBtn, loading && styles.btnDisabled]}
            onPress={handleRegister} disabled={loading}
          >
            <Text style={styles.registerBtnText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDF8F3' },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { paddingTop: 56, paddingBottom: 8 },
  backText: { color: '#C0392B', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: '#1A0F0A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8B6F5E', marginBottom: 24 },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#1A0F0A', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#1A0F0A', marginBottom: 4,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 14, backgroundColor: '#FFF5EC', borderWidth: 1.5, borderColor: '#E8D5C4', borderRadius: 12 },
  eyeIcon: { fontSize: 18 },
  terms: { fontSize: 13, color: '#8B6F5E', lineHeight: 20, marginTop: 12, marginBottom: 20 },
  termsLink: { color: '#C0392B', fontWeight: '600' },
  registerBtn: {
    backgroundColor: '#C0392B', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  registerBtnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 32 },
  footerText: { color: '#8B6F5E', fontSize: 15 },
  footerLink: { color: '#C0392B', fontSize: 15, fontWeight: '700' },
});
