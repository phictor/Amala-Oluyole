'use client';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

export default function TermsScreen() {
  const colors = useColors();
  return (
    <ScreenContainer>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.updated, { color: colors.muted }]}>Last updated: July 2026</Text>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By downloading, installing, or using the Amala Oluyole app, you agree to be bound by these Terms of Service. If you do not agree, please do not use the app.',
          },
          {
            title: '2. Use of the App',
            body: 'You must be at least 13 years old to use this app. You agree to use the app only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account credentials.',
          },
          {
            title: '3. Orders and Payment',
            body: 'All orders placed through the app are subject to acceptance by the restaurant. Prices are displayed in Nigerian Naira (₦) and are inclusive of applicable taxes. Payment must be completed before order preparation begins. We reserve the right to cancel orders in cases of pricing errors or unavailability.',
          },
          {
            title: '4. Delivery',
            body: 'Delivery times are estimates and may vary due to traffic, weather, or high demand. We are not liable for delays beyond our reasonable control. Delivery is available within the specified radius of each branch.',
          },
          {
            title: '5. Cancellations and Refunds',
            body: 'Orders may be cancelled before preparation begins. Once preparation has started, cancellations may not be accepted. Refunds for valid cancellations or incorrect orders will be processed within 3-5 business days to the original payment method.',
          },
          {
            title: '6. Loyalty Programme',
            body: 'Loyalty points are earned on eligible purchases and may be redeemed for discounts. Points have no cash value and cannot be transferred. We reserve the right to modify or discontinue the loyalty programme with notice.',
          },
          {
            title: '7. Intellectual Property',
            body: 'All content in the app, including text, images, logos, and software, is the property of Amala Oluyole Restaurant and is protected by copyright and trademark laws.',
          },
          {
            title: '8. Limitation of Liability',
            body: 'To the maximum extent permitted by law, Amala Oluyole shall not be liable for any indirect, incidental, or consequential damages arising from your use of the app or our services.',
          },
          {
            title: '9. Governing Law',
            body: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved in the courts of Oyo State, Nigeria.',
          },
          {
            title: '10. Contact',
            body: 'For questions about these Terms, contact us at legal@amalaoluyole.com or call 0812-345-6789.',
          },
        ].map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.muted }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 60 },
  backText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 60 },
  updated: { fontSize: 13, marginBottom: 16, fontStyle: 'italic' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22 },
});

